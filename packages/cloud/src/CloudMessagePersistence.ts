import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloud } from "./AssistantCloud";
import type {
  CloudMessage,
  CloudRunLease,
} from "./AssistantCloudThreadMessages";
import { CloudAPIError } from "./AssistantCloudAPI";
import type { CloudRunEndReason } from "./AssistantCloudThreadRuns";

const CLOUD_MESSAGE_PAGE_SIZE = 200;

/** How a write relates to the message's run: `running` opens or renews its lease, a reason ends it. */
export type CloudMessageRunPhase = "running" | CloudRunEndReason;

type OpenRun = {
  threadId: string;
  leaseId: string;
  remoteId: string;
  intervalMs: number;
  timer: ReturnType<typeof setTimeout> | undefined;
};

export type CloudMessagePersistenceOptions = {
  /**
   * Set when a run keeps going on the server after the tab that holds its
   * lease goes away (a backend that finishes the reply without the client,
   * such as an AG-UI agent the client rejoins with `connect()`). By default a
   * page that unloads ends every run this persistence holds with reason
   * `interrupted`, so the message reads `stale` at once; with this set, held
   * runs stay open and lapse when their lease's TTL runs out. A function is
   * read when the page hides, so a runtime can decide after construction.
   */
  runsContinueOnServer?: boolean | (() => boolean) | undefined;
};

/** 409 codes after which the lease is gone for good: nothing more is written for its message. */
const LOST_LEASE_CODES = new Set([
  "run_stale",
  "superseded",
  "run_ended",
  "lease_mismatch",
]);

const lostLeaseCode = (error: unknown): string | undefined =>
  error instanceof CloudAPIError &&
  error.status === 409 &&
  error.code !== undefined &&
  LOST_LEASE_CODES.has(error.code)
    ? error.code
    : undefined;

// A superseded lease's first write is stored once as a sibling of its message; the response names it.
const forkOf = (error: unknown): string | undefined => {
  if (lostLeaseCode(error) !== "superseded") return undefined;
  const forked = (error as CloudAPIError).details?.message_id;
  return typeof forked === "string" ? forked : undefined;
};

// A server that predates run leases rejects the unknown `run` key of its strict create schema.
// The server refuses a plain write to a message whose run lease is live in another session.
const isRunInProgress = (error: unknown) =>
  error instanceof CloudAPIError &&
  error.status === 409 &&
  error.code === "run_in_progress";

const isRunUnsupported = (error: unknown) =>
  error instanceof CloudAPIError && error.status === 400;

type FailedAppend = {
  threadId: string;
  parentId: string | null;
  format: string;
  content: ReadonlyJSONObject;
};

/**
 * Appends, updates and loads cloud messages while mapping local ids to cloud
 * ids and chaining parent_id. A parent that is still being created is awaited,
 * so concurrent appends land under the right parent. A parent whose create
 * failed is created again before its child, and a child whose parent still
 * cannot be created is stored as a root.
 *
 * A message appended as running holds a run lease, renewed by heartbeats on
 * the server's interval until a write with an end reason ends it. When the
 * page unloads, the runs it holds end as `interrupted` with a keepalive
 * request unless `runsContinueOnServer` is set; a page kept in the
 * back/forward cache keeps them and heartbeats as soon as it is shown again.
 * A plain write the server refuses because another session runs the message
 * (409 `run_in_progress`) is dropped with a warning. A lease that is lost (expired,
 * superseded by a resume, or refused) is final: the message gets no further
 * writes from this persistence.
 */
export class CloudMessagePersistence {
  private idMapping = new Map<string, string | Promise<string>>();
  private failedAppends = new Map<string, FailedAppend>();
  private openRuns = new Map<string, OpenRun>();
  private runWrites = new Map<string, Promise<unknown>>();
  /** Local ids whose lease was lost (stale, superseded, ended elsewhere); their later writes are dropped. */
  private lostRuns = new Set<string>();
  /** Local ids this persistence opened a lease for; a repeated append of one is a write to its row, not a new row. */
  private leasedMessages = new Set<string>();
  private pageHideTarget: Window | undefined;
  private getCloud: () => AssistantCloud;
  private options: CloudMessagePersistenceOptions;

  constructor(cloud: AssistantCloud, options?: CloudMessagePersistenceOptions);
  constructor(
    getCloud: () => AssistantCloud,
    options?: CloudMessagePersistenceOptions,
  );
  constructor(
    cloud: AssistantCloud | (() => AssistantCloud),
    options: CloudMessagePersistenceOptions = {},
  ) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
    this.options = options;
  }

  /**
   * Persist a message to the cloud.
   *
   * @param threadId - Remote thread ID
   * @param messageId - Local message ID (used for tracking)
   * @param parentId - Local parent message ID (or null for first message)
   * @param format - Message format (e.g., "aui/v0", "ai-sdk/v6")
   * @param content - Message content (format-specific)
   * @param run - `running` stores the message with an open run lease that is
   *   kept alive by heartbeats until a write with an end reason closes it.
   *   Once the lease is lost (it went stale, another session resumed the
   *   message, or the server refused it), later writes for the message are
   *   dropped.
   */
  async append(
    threadId: string,
    messageId: string,
    parentId: string | null,
    format: string,
    content: ReadonlyJSONObject,
    run?: CloudMessageRunPhase,
  ): Promise<void> {
    if (this.lostRuns.has(messageId)) return;
    const cloud = this.getCloud();
    const existing = this.idMapping.get(messageId);
    if (existing instanceof Promise) {
      await existing.catch(() => undefined);
      if (this.leasedMessages.has(messageId)) {
        await this.update(threadId, messageId, format, content, run);
      }
      return;
    }
    if (existing !== undefined && this.leasedMessages.has(messageId)) {
      await this.update(threadId, messageId, format, content, run);
      return;
    }

    this.failedAppends.delete(messageId);
    const task = (async () => {
      const resolvedParentId = parentId
        ? await this.resolveParentId(parentId)
        : null;
      const body = {
        parent_id: resolvedParentId,
        ...(messageId.length > 0 && messageId.length <= 255
          ? { external_id: messageId }
          : undefined),
        format,
        content,
      };
      if (run !== "running") {
        return (await cloud.threads.messages.create(threadId, body)).message_id;
      }
      let created: Awaited<ReturnType<typeof cloud.threads.messages.create>>;
      try {
        created = await cloud.threads.messages.create(threadId, {
          ...body,
          open_run: true,
        });
      } catch (error) {
        if (!isRunUnsupported(error)) throw error;
        created = await cloud.threads.messages.create(threadId, body);
      }
      if (created.run) {
        this.openRun(threadId, messageId, created.message_id, created.run);
      }
      return created.message_id;
    })();

    this.idMapping.set(messageId, task);
    try {
      const remoteId = await task;
      if (this.idMapping.get(messageId) === task) {
        this.idMapping.set(messageId, remoteId);
      }
    } catch (err) {
      if (this.idMapping.get(messageId) === task) {
        this.idMapping.delete(messageId);
        this.failedAppends.set(messageId, {
          threadId,
          parentId,
          format,
          content,
        });
      }
      throw err;
    }
  }

  private async resolveParentId(parentId: string): Promise<string | null> {
    await Promise.resolve(this.idMapping.get(parentId)).catch(() => undefined);
    const failedParent = this.failedAppends.get(parentId);
    try {
      if (failedParent && !this.idMapping.has(parentId)) {
        await this.append(
          failedParent.threadId,
          parentId,
          failedParent.parentId,
          failedParent.format,
          failedParent.content,
        );
      }
      return (await this.idMapping.get(parentId)) ?? parentId;
    } catch {
      return null;
    }
  }

  /**
   * Update an already-persisted message in the cloud.
   */
  async update(
    threadId: string,
    messageId: string,
    _format: string,
    content: ReadonlyJSONObject,
    run?: CloudMessageRunPhase,
  ): Promise<void> {
    if (this.lostRuns.has(messageId)) return;
    const cloud = this.getCloud();
    const remoteId = await this.getRemoteId(messageId);
    if (this.lostRuns.has(messageId)) return;
    if (!remoteId) {
      console.warn(
        `Skipping update for message ${messageId}: no remote id is mapped.`,
      );
      return;
    }
    if (!this.openRuns.has(messageId)) {
      await this.plainUpdate(threadId, messageId, remoteId, content);
      return;
    }
    // Writes of one run are serialized so a checkpoint can never land after the write that ends it.
    const previous = this.runWrites.get(messageId) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => this.writeRun(threadId, messageId, content, run ?? "done"));
    this.runWrites.set(messageId, task);
    try {
      await task;
    } finally {
      if (this.runWrites.get(messageId) === task)
        this.runWrites.delete(messageId);
    }
  }

  // A write without a lease; a message another session is running refuses it, and the write is dropped rather than surfaced.
  private async plainUpdate(
    threadId: string,
    messageId: string,
    remoteId: string,
    content: ReadonlyJSONObject,
  ): Promise<void> {
    try {
      await this.getCloud().threads.messages.update(threadId, remoteId, {
        content,
      });
    } catch (error) {
      if (!isRunInProgress(error)) throw error;
      console.warn(
        `[assistant-cloud] Skipped a write to message ${messageId}: another session is running it.`,
      );
    }
  }

  private async writeRun(
    threadId: string,
    messageId: string,
    content: ReadonlyJSONObject,
    phase: CloudMessageRunPhase,
  ): Promise<void> {
    if (this.lostRuns.has(messageId)) return;
    const open = this.openRuns.get(messageId);
    const cloud = this.getCloud();
    if (!open) {
      // Our own end closed the lease under an earlier write: a checkpoint is dropped, a final answer lands as a plain write.
      const remoteId = await this.getRemoteId(messageId);
      if (phase === "running" || !remoteId) return;
      await this.plainUpdate(threadId, messageId, remoteId, content);
      return;
    }
    try {
      await cloud.threads.messages.update(open.threadId, open.remoteId, {
        content,
        lease_id: open.leaseId,
      });
    } catch (error) {
      const code = lostLeaseCode(error);
      if (!code) throw error;
      const forkedId = forkOf(error);
      // Another session resumed this run: this write was stored once as a sibling, and nothing more is written there.
      if (forkedId) this.idMapping.set(messageId, forkedId);
      this.loseRun(
        messageId,
        forkedId ? `superseded, forked to ${forkedId}` : code,
      );
      return;
    }
    if (phase === "running") {
      this.scheduleHeartbeat(messageId);
      return;
    }
    this.closeRun(messageId);
    await cloud.threads.runs
      .end(open.threadId, open.leaseId, { reason: phase })
      .catch((error: unknown) => {
        if (!(error instanceof CloudAPIError) || error.status >= 500)
          throw error;
      });
  }

  /**
   * Moves a stored message's id mapping and run lease to a new local id, for
   * runtimes that swap a placeholder's id once the backend names the message.
   */
  async rename(from: string, to: string): Promise<void> {
    const entry = this.idMapping.get(from);
    if (entry === undefined || this.idMapping.has(to)) return;
    await Promise.resolve(entry).catch(() => undefined);
    const remoteId = this.idMapping.get(from);
    if (typeof remoteId !== "string" || this.idMapping.has(to)) return;
    this.idMapping.delete(from);
    this.idMapping.set(to, remoteId);
    if (this.lostRuns.delete(from)) this.lostRuns.add(to);
    if (this.leasedMessages.delete(from)) this.leasedMessages.add(to);
    const open = this.openRuns.get(from);
    if (!open) return;
    this.openRuns.delete(from);
    if (open.timer !== undefined) clearTimeout(open.timer);
    open.timer = undefined;
    this.openRuns.set(to, open);
    this.scheduleHeartbeat(to);
  }

  /** Whether a run lease this persistence opened for the message is still held. */
  hasOpenRun(messageId: string): boolean {
    return this.openRuns.has(messageId);
  }

  private openRun(
    threadId: string,
    messageId: string,
    remoteId: string,
    lease: CloudRunLease,
  ) {
    this.closeRun(messageId);
    this.lostRuns.delete(messageId);
    this.leasedMessages.add(messageId);
    this.openRuns.set(messageId, {
      threadId,
      leaseId: lease.lease_id,
      remoteId,
      intervalMs: lease.heartbeat_interval_ms,
      timer: undefined,
    });
    this.watchPageHide();
    this.scheduleHeartbeat(messageId);
  }

  private scheduleHeartbeat(messageId: string) {
    const open = this.openRuns.get(messageId);
    if (!open) return;
    if (open.timer !== undefined) clearTimeout(open.timer);
    open.timer = setTimeout(() => {
      open.timer = undefined;
      void this.heartbeat(messageId, open);
    }, open.intervalMs);
  }

  private async heartbeat(messageId: string, open: OpenRun) {
    if (this.openRuns.get(messageId) !== open) return;
    try {
      const response = await this.getCloud().threads.runs.heartbeat(
        open.threadId,
        open.leaseId,
      );
      open.intervalMs = response.heartbeat_interval_ms;
    } catch (error) {
      if (this.openRuns.get(messageId) !== open) return;
      if (error instanceof CloudAPIError && error.status === 409) {
        this.loseRun(messageId, error.code ?? "conflict");
        return;
      }
      if (error instanceof CloudAPIError && error.status === 404) {
        this.loseRun(messageId, "not found");
        return;
      }
    }
    if (this.openRuns.get(messageId) === open)
      this.scheduleHeartbeat(messageId);
  }

  /** The lease is gone for good: stop heartbeating and drop every later write for the message. */
  private loseRun(messageId: string, reason: string, quiet = false) {
    this.closeRun(messageId);
    if (this.lostRuns.has(messageId)) return;
    this.lostRuns.add(messageId);
    if (!quiet)
      console.warn(
        `[assistant-cloud] Lost the run lease of message ${messageId} (${reason}); later writes for it are dropped.`,
      );
  }

  private closeRun(messageId: string) {
    const open = this.openRuns.get(messageId);
    if (!open) return;
    if (open.timer !== undefined) clearTimeout(open.timer);
    this.openRuns.delete(messageId);
    if (this.openRuns.size === 0) this.unwatchPageHide();
  }

  private watchPageHide() {
    if (this.pageHideTarget) return;
    if (
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    )
      return;
    this.pageHideTarget = window;
    window.addEventListener("pagehide", this.onPageHide);
    window.addEventListener("pageshow", this.onPageShow);
  }

  private unwatchPageHide() {
    this.pageHideTarget?.removeEventListener("pagehide", this.onPageHide);
    this.pageHideTarget?.removeEventListener("pageshow", this.onPageShow);
    this.pageHideTarget = undefined;
  }

  private runsContinueOnServer(): boolean {
    const option = this.options.runsContinueOnServer;
    return typeof option === "function" ? option() : !!option;
  }

  // Heartbeats are main-thread timers that hidden tabs throttle, so an unloading page ends its runs as interrupted; the TTL covers a request that never lands. A page kept in the back/forward cache may come back, so its runs stay open.
  private onPageHide = (event: Event) => {
    if ((event as { persisted?: boolean }).persisted) return;
    if (this.runsContinueOnServer()) return;
    const cloud = this.getCloud();
    for (const [messageId, open] of [...this.openRuns]) {
      void cloud.threads.runs
        .end(
          open.threadId,
          open.leaseId,
          { reason: "interrupted" },
          { keepalive: true },
        )
        .catch(() => undefined);
      this.loseRun(messageId, "interrupted", true);
    }
  };

  // A page restored from the back/forward cache heartbeats at once: a lease still live keeps going, one that expired meanwhile is lost.
  private onPageShow = (event: Event) => {
    if (!(event as { persisted?: boolean }).persisted) return;
    for (const [messageId, open] of [...this.openRuns]) {
      if (open.timer !== undefined) clearTimeout(open.timer);
      open.timer = undefined;
      void this.heartbeat(messageId, open);
    }
  };

  /**
   * Delete mapped messages from the cloud and clear their local ID mappings.
   */
  async delete(threadId: string, messageIds: string[]): Promise<void> {
    const cloud = this.getCloud();
    const mapping = this.idMapping;
    const resolved: {
      localId: string;
      entry: string | Promise<string>;
      remoteId: string;
    }[] = [];
    for (const localId of messageIds) {
      const entry = mapping.get(localId);
      if (!entry) continue;
      try {
        resolved.push({ localId, entry, remoteId: await entry });
      } catch {
        continue;
      }
    }
    for (const localId of messageIds) this.failedAppends.delete(localId);
    if (resolved.length === 0) return;

    try {
      await cloud.threads.messages.delete(
        threadId,
        resolved.map(({ remoteId }) => remoteId),
      );
    } catch (error) {
      if (!(error instanceof CloudAPIError && error.status === 404))
        throw error;
    }

    for (const { localId, entry, remoteId } of resolved) {
      const current = mapping.get(localId);
      if (current === entry || current === remoteId) mapping.delete(localId);
    }
  }

  /**
   * Check if a message has been persisted (or is currently being persisted).
   */
  isPersisted(messageId: string): boolean {
    return this.idMapping.has(messageId);
  }

  /**
   * Get the remote ID for a local message ID (resolved).
   * Returns undefined if not persisted.
   */
  async getRemoteId(messageId: string): Promise<string | undefined> {
    const entry = this.idMapping.get(messageId);
    if (!entry) return undefined;
    return entry;
  }

  getResolvedRemoteId(messageId: string): string | undefined {
    const entry = this.idMapping.get(messageId);
    return typeof entry === "string" ? entry : undefined;
  }

  record(localId: string, remoteId: string): void {
    this.idMapping.set(localId, remoteId);
  }

  /**
   * Load messages from the cloud and populate the ID mapping.
   *
   * The list endpoint caps a response at 200 rows, so pages are followed by
   * message ID cursor until a short page and concatenated in server order.
   *
   * The ID mapping is populated so that `isPersisted()` returns true for
   * loaded messages, preventing re-persistence of already-stored messages.
   *
   * A loaded ID that an append already maps keeps the remote ID from that append, and falls back to the loaded ID if the append fails.
   *
   * @param threadId - Remote thread ID
   * @param format - Optional format filter
   * @returns Array of cloud messages
   */
  async load(threadId: string, format?: string) {
    const idMapping = this.idMapping;
    const cloud = this.getCloud();
    const messages: CloudMessage[] = [];
    const seen = new Set<string>();
    let after: string | undefined;

    while (true) {
      const page = await cloud.threads.messages.list(threadId, {
        ...(format ? { format } : undefined),
        limit: CLOUD_MESSAGE_PAGE_SIZE,
        ...(after ? { after } : undefined),
      });
      const last = page.messages.at(-1);
      if (!last) break;

      // A cursor the server cannot resolve drops the keyset filter and replays
      // an earlier page, so already-seen rows end the walk instead of repeating.
      const fresh = page.messages.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) break;
      for (const m of fresh) seen.add(m.id);

      messages.push(...fresh);
      if (page.messages.length < CLOUD_MESSAGE_PAGE_SIZE) break;
      after = last.id;
    }

    if (this.idMapping === idMapping) {
      for (const m of messages) {
        const entry = idMapping.get(m.id);
        if (entry === undefined) {
          idMapping.set(m.id, m.id);
        } else if (entry instanceof Promise) {
          void entry.catch(() => {
            const current = idMapping.get(m.id);
            if (current === undefined || current === entry) {
              idMapping.set(m.id, m.id);
            }
          });
        }
      }
    }
    return messages;
  }

  /**
   * Reset the ID mapping (call when switching threads).
   *
   * Pending `load()` and `append()` calls are not cancelled and still settle
   * normally, but their results no longer populate the ID mapping.
   */
  reset() {
    this.idMapping = new Map();
    this.failedAppends = new Map();
    this.lostRuns = new Set();
    this.leasedMessages = new Set();
    for (const messageId of [...this.openRuns.keys()]) this.closeRun(messageId);
    this.unwatchPageHide();
  }
}
