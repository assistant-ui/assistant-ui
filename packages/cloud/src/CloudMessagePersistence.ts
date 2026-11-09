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
  superseded: boolean;
};

const isRunWriteRefusal = (error: unknown): error is CloudAPIError =>
  error instanceof CloudAPIError &&
  error.status === 409 &&
  (error.code === "run_ended" || error.code === "lease_mismatch");

// A server that predates run leases rejects the unknown `run` key of its strict create schema.
const forkOf = (error: unknown): string | undefined => {
  if (
    !(error instanceof CloudAPIError) ||
    error.status !== 409 ||
    error.code !== "superseded"
  )
    return undefined;
  const forked = error.details?.message_id;
  return typeof forked === "string" ? forked : undefined;
};

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
 */
export class CloudMessagePersistence {
  private idMapping = new Map<string, string | Promise<string>>();
  private failedAppends = new Map<string, FailedAppend>();
  private openRuns = new Map<string, OpenRun>();
  private runWrites = new Map<string, Promise<unknown>>();
  private getCloud: () => AssistantCloud;

  constructor(cloud: AssistantCloud);
  constructor(getCloud: () => AssistantCloud);
  constructor(cloud: AssistantCloud | (() => AssistantCloud)) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
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
   *   kept alive by heartbeats until a write with an end reason closes it
   */
  async append(
    threadId: string,
    messageId: string,
    parentId: string | null,
    format: string,
    content: ReadonlyJSONObject,
    run?: CloudMessageRunPhase,
  ): Promise<void> {
    const cloud = this.getCloud();
    const existing = this.idMapping.get(messageId);
    if (existing instanceof Promise) {
      await existing.catch(() => undefined);
      if (this.openRuns.has(messageId)) {
        await this.update(threadId, messageId, format, content, run);
      }
      return;
    }
    if (existing !== undefined && this.openRuns.has(messageId)) {
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
    const cloud = this.getCloud();
    const remoteId = await this.getRemoteId(messageId);
    if (!remoteId) {
      console.warn(
        `Skipping update for message ${messageId}: no remote id is mapped.`,
      );
      return;
    }
    if (!this.openRuns.has(messageId)) {
      await cloud.threads.messages.update(threadId, remoteId, { content });
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

  private async writeRun(
    threadId: string,
    messageId: string,
    content: ReadonlyJSONObject,
    phase: CloudMessageRunPhase,
  ): Promise<void> {
    const open = this.openRuns.get(messageId);
    const cloud = this.getCloud();
    if (!open) {
      // The lease closed under an earlier write: a checkpoint is dropped, a final answer lands as a plain write.
      const remoteId = await this.getRemoteId(messageId);
      if (phase === "running" || !remoteId) return;
      await cloud.threads.messages.update(threadId, remoteId, { content });
      return;
    }
    try {
      await cloud.threads.messages.update(open.threadId, open.remoteId, {
        content,
        lease_id: open.leaseId,
      });
    } catch (error) {
      const forkedId = forkOf(error);
      if (forkedId) {
        // Another session resumed this run; the write was stored as a sibling and the lease now writes there.
        open.remoteId = forkedId;
        this.idMapping.set(messageId, forkedId);
      } else if (isRunWriteRefusal(error)) {
        this.closeRun(messageId);
        return;
      } else {
        throw error;
      }
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
    this.openRuns.set(messageId, {
      threadId,
      leaseId: lease.lease_id,
      remoteId,
      intervalMs: lease.heartbeat_interval_ms,
      timer: undefined,
      superseded: false,
    });
    this.scheduleHeartbeat(messageId);
  }

  private scheduleHeartbeat(messageId: string) {
    const open = this.openRuns.get(messageId);
    if (!open || open.superseded) return;
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
      if (error instanceof CloudAPIError && error.status === 409) {
        if (error.code === "superseded") {
          // Another session resumed this run; its next write forks to a sibling instead of overwriting the resumed reply.
          open.superseded = true;
          return;
        }
        this.closeRun(messageId);
        return;
      }
      if (error instanceof CloudAPIError && error.status === 404) {
        this.closeRun(messageId);
        return;
      }
    }
    if (this.openRuns.get(messageId) === open)
      this.scheduleHeartbeat(messageId);
  }

  private closeRun(messageId: string) {
    const open = this.openRuns.get(messageId);
    if (!open) return;
    if (open.timer !== undefined) clearTimeout(open.timer);
    this.openRuns.delete(messageId);
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
    for (const messageId of [...this.openRuns.keys()]) this.closeRun(messageId);
  }
}
