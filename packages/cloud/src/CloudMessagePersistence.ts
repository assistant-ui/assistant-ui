import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloud } from "./AssistantCloud";
import type {
  CloudMessage,
  CloudMessageRun,
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
  intervalMs: number;
  timer: ReturnType<typeof setTimeout> | undefined;
};

/**
 * A message's run lease as this persistence knows it: held, ended by our own
 * final write, or lost (ended elsewhere or refused). A lost run's message gets no
 * further writes; an ended one only plain writes.
 */
type Run = OpenRun | "ended" | "lost";

const isOpen = (run: Run | undefined): run is OpenRun =>
  typeof run === "object";

/** How long a running lease may go without a heartbeat before its message reads as stale. */
export const DEFAULT_RUN_STALE_AFTER_MS = 30_000;

export type CloudMessagePersistenceOptions = {
  /**
   * Milliseconds without a heartbeat after which a running lease reads as
   * stale, which is what a run whose tab went away looks like. Default
   * 30 000. The server never expires a run: a late run that beats again
   * reads as running again, and its writes still land.
   */
  staleAfter?: number | undefined;
};

/** Where a listed message's run stands for a reader: still beating, or quiet for longer than `staleAfter`. */
export type CloudRunState =
  | { status: "in-progress"; staleInMs: number }
  | { status: "stale" };

/** 409 codes after which the lease is gone for good: nothing more is written for its message. */
const LOST_LEASE_CODES = new Set(["run_ended", "lease_mismatch"]);

const lostLeaseCode = (error: unknown): string | undefined =>
  error instanceof CloudAPIError &&
  error.status === 409 &&
  error.code !== undefined &&
  LOST_LEASE_CODES.has(error.code)
    ? error.code
    : undefined;

// A server that predates run leases rejects the unknown `open_run` key of its strict create schema.
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
 * the server's interval until a write with an end reason ends it. Heartbeats
 * keep running while the page is in the background. The server never
 * expires a lease; readers show a run as stale once it has gone `staleAfter`
 * without a beat, and a late run keeps writing its own message. A lease that
 * is lost (ended elsewhere or refused) is final: the message gets no further
 * writes from this persistence.
 */
export class CloudMessagePersistence {
  private idMapping = new Map<string, string | Promise<string>>();
  private failedAppends = new Map<string, FailedAppend>();
  /** Every message this persistence opened a lease for; a repeated append of one writes its row instead of storing another. */
  private runs = new Map<string, Run>();
  private runWrites = new Map<string, Promise<unknown>>();
  private getCloud: () => AssistantCloud;
  private staleAfter: number;

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
    this.staleAfter = options.staleAfter ?? DEFAULT_RUN_STALE_AFTER_MS;
  }

  /**
   * Reads a listed message's run against `staleAfter`; `sinceReadMs` is the
   * time since the list was read. Undefined for no run or an ended one.
   */
  runStateOf(
    run: CloudMessageRun | undefined,
    sinceReadMs = 0,
  ): CloudRunState | undefined {
    if (run?.status !== "running") return undefined;
    const quietMs = run.last_heartbeat_ms_ago + sinceReadMs;
    return quietMs >= this.staleAfter
      ? { status: "stale" }
      : { status: "in-progress", staleInMs: this.staleAfter - quietMs };
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
   *   Once the lease is lost (it was ended elsewhere or the server refused
   *   it), later writes for the message are dropped.
   */
  async append(
    threadId: string,
    messageId: string,
    parentId: string | null,
    format: string,
    content: ReadonlyJSONObject,
    run?: CloudMessageRunPhase,
  ): Promise<void> {
    if (this.runs.get(messageId) === "lost") return;
    const cloud = this.getCloud();
    const existing = this.idMapping.get(messageId);
    if (existing instanceof Promise) {
      const mapping = this.idMapping;
      await existing.catch(() => undefined);
      // A reset while waiting moved to another thread; this write belongs to the old one.
      if (this.idMapping !== mapping) return;
      // The in-flight create may hold older content, such as the run tracker's running placeholder: write this content over its row, or create the row with it when that create failed.
      if (this.idMapping.has(messageId)) {
        await this.update(threadId, messageId, format, content, run);
      } else {
        await this.append(threadId, messageId, parentId, format, content, run);
      }
      return;
    }
    if (existing !== undefined && this.runs.has(messageId)) {
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
        this.openRun(threadId, messageId, created.run);
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
    if (this.runs.get(messageId) === "lost") return;
    const remoteId = await this.getRemoteId(messageId);
    if (this.runs.get(messageId) === "lost") return;
    if (!remoteId) {
      console.warn(
        `Skipping update for message ${messageId}: no remote id is mapped.`,
      );
      return;
    }
    if (!this.runs.has(messageId)) {
      await this.getCloud().threads.messages.update(threadId, remoteId, {
        content,
      });
      return;
    }
    // Writes of a leased message are serialized so a checkpoint can never land after the write that ends it.
    const previous = this.runWrites.get(messageId) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() =>
        this.writeRun(threadId, messageId, remoteId, content, run ?? "done"),
      );
    this.runWrites.set(messageId, task);
    try {
      await task;
    } finally {
      if (this.runWrites.get(messageId) === task)
        this.runWrites.delete(messageId);
    }
  }

  private async writeRun(
    threadId: string,
    messageId: string,
    remoteId: string,
    content: ReadonlyJSONObject,
    phase: CloudMessageRunPhase,
  ): Promise<void> {
    const open = this.runs.get(messageId);
    if (open === "lost") return;
    const cloud = this.getCloud();
    if (!isOpen(open)) {
      // Our own end closed the lease under an earlier write: a checkpoint is dropped, a final answer lands as a plain write.
      if (phase === "running") return;
      await cloud.threads.messages.update(threadId, remoteId, { content });
      return;
    }
    try {
      await cloud.threads.messages.update(open.threadId, remoteId, {
        content,
        lease_id: open.leaseId,
      });
    } catch (error) {
      const code = lostLeaseCode(error);
      if (!code) throw error;
      this.loseRun(messageId, code);
      return;
    }
    if (phase === "running") {
      this.scheduleHeartbeat(messageId);
      return;
    }
    this.closeRun(messageId, "ended");
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
    const run = this.runs.get(from);
    if (run === undefined) return;
    this.runs.delete(from);
    this.runs.set(to, run);
    if (isOpen(run)) this.scheduleHeartbeat(to);
  }

  /** Whether a run lease this persistence opened for the message is still held. */
  hasOpenRun(messageId: string): boolean {
    return isOpen(this.runs.get(messageId));
  }

  private openRun(threadId: string, messageId: string, lease: CloudRunLease) {
    const previous = this.runs.get(messageId);
    if (isOpen(previous) && previous.timer !== undefined)
      clearTimeout(previous.timer);
    this.runs.set(messageId, {
      threadId,
      leaseId: lease.lease_id,
      intervalMs: lease.heartbeat_interval_ms,
      timer: undefined,
    });
    this.scheduleHeartbeat(messageId);
  }

  private scheduleHeartbeat(messageId: string) {
    const open = this.runs.get(messageId);
    if (!isOpen(open)) return;
    if (open.timer !== undefined) clearTimeout(open.timer);
    open.timer = setTimeout(() => {
      open.timer = undefined;
      void this.heartbeat(messageId, open);
    }, open.intervalMs);
  }

  private async heartbeat(messageId: string, open: OpenRun) {
    if (this.runs.get(messageId) !== open) return;
    try {
      const response = await this.getCloud().threads.runs.heartbeat(
        open.threadId,
        open.leaseId,
      );
      open.intervalMs = response.heartbeat_interval_ms;
    } catch (error) {
      if (this.runs.get(messageId) !== open) return;
      // An ended lease, or one the server does not know, is final; a network error is retried on the next beat.
      if (
        error instanceof CloudAPIError &&
        (error.status === 409 || error.status === 404)
      ) {
        this.loseRun(messageId, error.code ?? String(error.status));
        return;
      }
    }
    if (this.runs.get(messageId) === open) this.scheduleHeartbeat(messageId);
  }

  /** The lease is gone for good: stop heartbeating and drop every later write for the message. */
  private loseRun(messageId: string, reason: string) {
    if (this.runs.get(messageId) === "lost") return;
    this.closeRun(messageId, "lost");
    console.warn(
      `[assistant-cloud] Lost the run lease of message ${messageId} (${reason}); later writes for it are dropped.`,
    );
  }

  private closeRun(messageId: string, as: "ended" | "lost") {
    const open = this.runs.get(messageId);
    if (isOpen(open) && open.timer !== undefined) clearTimeout(open.timer);
    this.runs.set(messageId, as);
  }

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
    for (const run of this.runs.values())
      if (isOpen(run) && run.timer !== undefined) clearTimeout(run.timer);
    this.runs = new Map();
  }
}
