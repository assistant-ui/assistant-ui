/**
 * Process-singleton session supervisor — the node host that drives the real Pi
 * SDK (`@earendil-works/pi-coding-agent`) and exposes a multi-thread view of
 * Pi's single-active-session runtime.
 *
 * This is the one file (with `piNodeExtensionUi`) that imports the Pi SDK at
 * runtime. It is reachable only from `node.ts`, never from `index.ts`, so the
 * browser boundary holds (PI_MVP_PLAN "Package Shape").
 *
 * The host keeps catalog reads, read-only snapshots, and live runtimes separate:
 * catalog reads use cached `SessionManager.list()` metadata, cold `getThread()`
 * reads a session-file snapshot, and a live `AgentSession` record is created
 * only when an operation needs Pi execution or explicit live events. A browser
 * disconnect (last `subscribe` unsubscribe) does NOT abort the run — only an
 * explicit `cancelRun` or process exit stops it.
 */
import {
  AuthStorage,
  type AgentSession,
  type AgentSessionEvent,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import { unlink } from "node:fs/promises";
import {
  deriveReadiness,
  mapModelInfo,
  mapReadonlyMetadata,
  mapSessionEvent,
  mapSessionInfo,
  readinessFromSessionContext,
  toPiMessages,
} from "./piNodeMapping";
import { deriveContextUsage } from "./piContextUsage";
import {
  createSupervisorUiBridge,
  type SupervisorUiBridge,
} from "./piNodeExtensionUi";
import type {
  PiClientEvent,
  PiClientEventBody,
  PiContextUsage,
  PiModelInfo,
  PiQueuedMessage,
  PiThinkingLevel,
  PiThreadMetadata,
  PiThreadSnapshot,
  PiThreadStatus,
  PiHostUiRequest,
  PiHostUiResponse,
  PiRuntimeReadiness,
  PiSendMessageInput,
} from "./piTypes";

/** The `model` shape `createAgentSession` accepts (a Pi `Model`), derived from
 * the SDK so the supervisor stays the only file that names it. The host resolves
 * it (e.g. env-seeded via `ModelRegistry.find`) and forwards it opaquely. */
type PiSessionModel = NonNullable<
  Parameters<typeof createAgentSession>[0]
>["model"];
type PiSessionInfo = Awaited<ReturnType<typeof SessionManager.list>>[number];

type CatalogCacheEntry = {
  infos: readonly PiSessionInfo[] | undefined;
  promise: Promise<readonly PiSessionInfo[]> | undefined;
};

export interface PiThreadSupervisorOptions {
  /** Default workspace for `listThreads`/`createThread` when a call omits one.
   * Defaults to `process.cwd()`. */
  workspacePath?: string;
  /** Global Pi config dir (`~/.pi/agent` by default). Forwarded to the SDK. */
  agentDir?: string;
  /** Explicit model for new sessions (PI_MVP_PLAN §5 env seeding). When omitted,
   * Pi resolves from its own settings, else the first available model. */
  model?: PiSessionModel;
}

type ThreadRecord = {
  threadId: string;
  session: AgentSession;
  uiBridge: SupervisorUiBridge;
  unsubscribe: () => void;
  listeners: Set<(event: PiClientEvent) => void>;
  /** Monotonic per-thread sequence stamped on every emitted event. */
  seq: number;
  /** Derived turn index (counts `turn_start`s; first turn = 0). */
  turnIndex: number;
  /** Mirror of the UI bridge's pending requests, for snapshots/reconnect. */
  hostUiRequests: PiHostUiRequest[];
  requestCounter: number;
  workspacePath: string;
  lastError: string | undefined;
};

const errorText = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

export class PiThreadSupervisor {
  private readonly records = new Map<string, ThreadRecord>();
  private readonly recordsBySessionFile = new Map<string, ThreadRecord>();
  private readonly workspacePath: string;
  private readonly agentDir: string | undefined;
  private readonly model: PiSessionModel | undefined;
  private readonly modelRegistry: ModelRegistry;
  private readonly archivedSessionFiles = new Set<string>();
  private readonly catalogCache = new Map<string, CatalogCacheEntry>();
  private readonly catalogInfoByThreadId = new Map<string, PiSessionInfo>();

  constructor(options: PiThreadSupervisorOptions = {}) {
    this.workspacePath = options.workspacePath ?? process.cwd();
    this.agentDir = options.agentDir;
    this.model = options.model;
    this.modelRegistry = ModelRegistry.create(
      AuthStorage.create(
        options.agentDir ? `${options.agentDir}/auth.json` : undefined,
      ),
    );
  }

  // --- Catalog ---------------------------------------------------------------

  async listThreads(input?: {
    workspacePath?: string;
    includeArchived?: boolean;
  }): Promise<PiThreadMetadata[]> {
    const cwd = input?.workspacePath ?? this.workspacePath;
    const infos = await this.listSessionInfos(cwd);
    return infos
      .filter(
        (info) =>
          input?.includeArchived || !this.archivedSessionFiles.has(info.path),
      )
      .map((info) => {
        const liveStatus = this.liveStatusFor(info.id);
        return {
          ...mapSessionInfo(info, liveStatus ? { liveStatus } : undefined),
          ...(this.archivedSessionFiles.has(info.path)
            ? { archived: true }
            : {}),
        };
      });
  }

  async createThread(input?: {
    workspacePath?: string;
    title?: string;
    initialMessage?: PiSendMessageInput;
  }): Promise<PiThreadSnapshot> {
    const cwd = input?.workspacePath ?? this.workspacePath;
    const sessionManager = SessionManager.create(cwd);
    const record = await this.openSession(sessionManager, cwd);
    this.invalidateCatalog(cwd);
    if (input?.title) record.session.setSessionName(input.title);
    if (input?.initialMessage) await this.send(record, input.initialMessage);
    return this.snapshotOf(record);
  }

  async getThread(threadId: string): Promise<PiThreadSnapshot> {
    const live = this.records.get(threadId);
    if (live) return this.snapshotOf(live);
    const info = await this.findSessionInfo(threadId);
    if (!info) throw new Error(`Unknown Pi thread: ${threadId}`);
    return this.snapshotFromSessionFile(info);
  }

  // --- Run loop --------------------------------------------------------------

  async sendMessage(
    threadId: string,
    input: PiSendMessageInput,
  ): Promise<void> {
    await this.send(await this.ensureOpen(threadId), input);
  }

  async cancelRun(threadId: string): Promise<void> {
    await this.records.get(threadId)?.session.abort();
  }

  async getAvailableModels(): Promise<PiModelInfo[]> {
    this.modelRegistry.refresh();
    const available = this.modelRegistry.getAvailable();
    const catalog =
      available.length > 0 ? available : this.modelRegistry.getAll();
    return catalog.map(mapModelInfo);
  }

  async setModel(
    threadId: string,
    input: { provider: string; modelId: string },
  ): Promise<void> {
    const record = await this.ensureOpen(threadId);
    const model = this.modelRegistry.find(input.provider, input.modelId);
    if (!model) {
      throw new Error(
        `${input.provider}/${input.modelId} is not in Pi's model registry`,
      );
    }
    await record.session.setModel(model);
    record.lastError = undefined;
    this.emit(record, { type: "snapshot", snapshot: this.snapshotOf(record) });
  }

  async setThinkingLevel(
    threadId: string,
    level: PiThinkingLevel,
  ): Promise<void> {
    const record = await this.ensureOpen(threadId);
    record.session.setThinkingLevel(level as never);
    this.emit(record, { type: "thinking_level_changed", level });
    this.emit(record, { type: "snapshot", snapshot: this.snapshotOf(record) });
  }

  async renameThread(threadId: string, title: string): Promise<void> {
    const record = this.records.get(threadId);
    if (record) {
      record.session.setSessionName(title);
      this.invalidateCatalog(record.workspacePath);
      return;
    }

    const info = await this.findSessionInfo(threadId);
    if (!info) throw new Error(`Unknown Pi thread: ${threadId}`);
    SessionManager.open(info.path).appendSessionInfo(title);
    this.invalidateCatalog(info.cwd || this.workspacePath);
  }

  async archiveThread(threadId: string): Promise<void> {
    const record = this.records.get(threadId);
    const info = record ? undefined : await this.findSessionInfo(threadId);
    const sessionFile = record?.session.sessionFile ?? info?.path;
    if (!sessionFile) throw new Error(`Unknown Pi thread: ${threadId}`);
    this.archivedSessionFiles.add(sessionFile);
    this.invalidateCatalog(
      record?.workspacePath ?? info?.cwd ?? this.workspacePath,
    );
    if (record) {
      this.emit(record, {
        type: "snapshot",
        snapshot: this.snapshotOf(record),
      });
    }
  }

  async unarchiveThread(threadId: string): Promise<void> {
    const info = await this.findSessionInfo(threadId);
    if (info) this.archivedSessionFiles.delete(info.path);
    const record = this.records.get(threadId);
    if (record) {
      this.emit(record, {
        type: "snapshot",
        snapshot: this.snapshotOf(record),
      });
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    const record = this.records.get(threadId);
    const info = record ? undefined : await this.findSessionInfo(threadId);
    const sessionFile = record?.session.sessionFile ?? info?.path;
    const workspacePath = record?.workspacePath ?? info?.cwd;
    if (!sessionFile) throw new Error(`Unknown Pi thread: ${threadId}`);
    if (record) {
      record.unsubscribe();
      record.uiBridge.dismissAll();
      record.session.dispose();
      this.records.delete(threadId);
      if (sessionFile) this.recordsBySessionFile.delete(sessionFile);
    }
    this.archivedSessionFiles.delete(sessionFile);
    this.catalogInfoByThreadId.delete(threadId);
    await unlink(sessionFile).catch((err: unknown) => {
      if ((err as { code?: string }).code !== "ENOENT") throw err;
    });
    if (workspacePath) this.invalidateCatalog(workspacePath);
  }

  async respondToHostUiRequest(
    threadId: string,
    response: PiHostUiResponse,
  ): Promise<void> {
    this.records.get(threadId)?.uiBridge.resolve(response);
  }

  subscribe(
    threadId: string,
    listener: (event: PiClientEvent) => void,
    options?: { includeSnapshot?: boolean },
  ): () => void {
    let active = true;
    let record: ThreadRecord | undefined;
    void this.ensureOpen(threadId)
      .then((r) => {
        if (!active) return;
        record = r;
        r.listeners.add(listener);
        if (options?.includeSnapshot !== false) {
          // Snapshot-first when requested: the authoritative current state,
          // stamped with the record's seq so subsequent live events apply on top.
          listener({
            type: "snapshot",
            snapshot: this.snapshotOf(r),
            threadId,
            seq: r.seq,
          });
        }
      })
      .catch((err) => {
        if (active) {
          listener({ type: "error", error: errorText(err), threadId, seq: 0 });
        }
      });
    return () => {
      // Disconnect ≠ abort: keep the record and its run alive.
      active = false;
      record?.listeners.delete(listener);
    };
  }

  /** Tear down every record (process exit). Aborts nothing implicitly — call
   * `cancelRun` first if a graceful stop is wanted. */
  async dispose(): Promise<void> {
    for (const record of [...this.records.values()]) {
      record.unsubscribe();
      record.uiBridge.dismissAll();
      record.session.dispose();
    }
    this.records.clear();
    this.recordsBySessionFile.clear();
  }

  // --- Internals -------------------------------------------------------------

  private async openSession(
    sessionManager: SessionManager,
    cwd: string,
  ): Promise<ThreadRecord> {
    const { session } = await createAgentSession({
      cwd,
      sessionManager,
      ...(this.agentDir ? { agentDir: this.agentDir } : {}),
      ...(this.model ? { model: this.model } : {}),
    });
    const threadId = session.sessionId;

    const record: ThreadRecord = {
      threadId,
      session,
      uiBridge: undefined as unknown as SupervisorUiBridge,
      unsubscribe: () => {},
      listeners: new Set(),
      seq: 0,
      turnIndex: -1,
      hostUiRequests: [],
      requestCounter: 0,
      workspacePath: cwd,
      lastError: undefined,
    };

    const uiBridge = createSupervisorUiBridge({
      nextRequestId: () => `${threadId}:ui:${++record.requestCounter}`,
      currentToolCallId: () => {
        // Single-tool causality: only correlate when exactly one tool runs.
        const pending = session.state.pendingToolCalls;
        return pending.size === 1 ? [...pending][0] : undefined;
      },
      emitRequest: (request) => {
        record.hostUiRequests = uiBridge.pending();
        this.emit(record, { type: "extension_ui_request", request });
      },
      emitResolved: (requestId) => {
        record.hostUiRequests = uiBridge.pending();
        this.emit(record, { type: "extension_ui_resolved", requestId });
      },
    });
    record.uiBridge = uiBridge;

    await session.bindExtensions({
      uiContext: uiBridge.ui,
      onError: (error) => {
        record.lastError = error.error;
        this.emit(record, { type: "error", error: error.error });
      },
    });

    record.unsubscribe = session.subscribe((event) =>
      this.onSessionEvent(record, event),
    );
    this.records.set(threadId, record);
    if (session.sessionFile) {
      this.recordsBySessionFile.set(session.sessionFile, record);
    }
    return record;
  }

  private async ensureOpen(threadId: string): Promise<ThreadRecord> {
    const existing = this.records.get(threadId);
    if (existing) return existing;
    const info = await this.findSessionInfo(threadId);
    if (!info) throw new Error(`Unknown Pi thread: ${threadId}`);
    const existingBySessionFile = this.recordsBySessionFile.get(info.path);
    if (existingBySessionFile) {
      this.records.set(threadId, existingBySessionFile);
      return existingBySessionFile;
    }
    const sessionManager = SessionManager.open(info.path);
    return this.openSession(sessionManager, info.cwd || this.workspacePath);
  }

  private async listSessionInfos(
    workspacePath: string,
  ): Promise<readonly PiSessionInfo[]> {
    const existing = this.catalogCache.get(workspacePath);
    if (existing?.infos) return existing.infos;
    if (existing?.promise) return existing.promise;

    const entry: CatalogCacheEntry = { infos: undefined, promise: undefined };
    const promise = SessionManager.list(workspacePath)
      .then((infos) => {
        entry.infos = infos;
        this.rememberSessionInfos(infos);
        return infos;
      })
      .finally(() => {
        entry.promise = undefined;
      });
    entry.promise = promise;
    this.catalogCache.set(workspacePath, entry);
    return promise;
  }

  private invalidateCatalog(workspacePath = this.workspacePath) {
    this.catalogCache.delete(workspacePath);
  }

  private async findSessionInfo(threadId: string) {
    const cached = this.catalogInfoByThreadId.get(threadId);
    if (cached) return cached;
    const local = await this.listSessionInfos(this.workspacePath);
    const hit = local.find((info) => info.id === threadId);
    if (hit) return hit;
    const all = await SessionManager.listAll();
    this.rememberSessionInfos(all);
    return all.find((info) => info.id === threadId);
  }

  private rememberSessionInfos(infos: readonly PiSessionInfo[]) {
    for (const info of infos) {
      this.catalogInfoByThreadId.set(info.id, info);
    }
  }

  private async send(
    record: ThreadRecord,
    input: PiSendMessageInput,
  ): Promise<void> {
    const options: NonNullable<Parameters<AgentSession["prompt"]>[1]> = {};
    if (input.streamingBehavior)
      options.streamingBehavior = input.streamingBehavior;
    if (input.attachments?.length) options.images = input.attachments;

    let settlePreflight: (error?: unknown) => void = () => {};
    let preflightSettled = false;
    const accepted = new Promise<void>((resolve, reject) => {
      settlePreflight = (error) => {
        if (preflightSettled) return;
        preflightSettled = true;
        if (error) reject(error);
        else resolve();
      };
    });

    options.preflightResult = (success) => {
      if (success) settlePreflight();
      else settlePreflight(new Error("Pi rejected the prompt before running"));
    };

    void record.session
      .prompt(input.content, options)
      .then(() => {
        settlePreflight();
        record.lastError = undefined;
      })
      .catch((err: unknown) => {
        record.lastError = errorText(err);
        this.emit(record, { type: "error", error: record.lastError });
        settlePreflight(err);
      });

    try {
      await accepted;
      record.lastError = undefined;
    } catch (err) {
      record.lastError = errorText(err);
      this.emit(record, { type: "error", error: record.lastError });
      throw err;
    }
  }

  private onSessionEvent(record: ThreadRecord, event: AgentSessionEvent): void {
    if (event.type === "turn_start") record.turnIndex += 1;
    // Pi renames sessions itself (e.g. auto-titling after the first turn);
    // without this the cached catalog would keep serving the stale title.
    if (event.type === "session_info_changed") {
      this.invalidateCatalog(record.workspacePath);
    }
    this.emit(record, mapSessionEvent(event, { turnIndex: record.turnIndex }));

    // Context usage isn't its own SDK event — synthesize it at run boundaries
    // (the "am I about to auto-compact?" affordance, PI_MVP_PLAN §6 / Event Model).
    if (
      event.type === "turn_end" ||
      event.type === "agent_end" ||
      event.type === "compaction_end"
    ) {
      this.emitContextUsage(record);
    }
    // Surface a failed/aborted assistant turn's error.
    if (event.type === "agent_end") {
      const message = record.session.state.errorMessage;
      if (message) {
        record.lastError = message;
        this.emit(record, { type: "error", error: message });
      }
    }
  }

  private emitContextUsage(record: ThreadRecord): void {
    const usage = record.session.getContextUsage();
    if (usage) {
      this.emit(record, {
        type: "context_usage",
        contextUsage: usage satisfies PiContextUsage,
      });
    }
  }

  /** Stamp the per-thread seq and deliver to listeners. Delivery is synchronous
   * and therefore already ordered (Pi calls us synchronously); the plan's
   * serialized queue only matters once async snapshot persistence lands
   * (HTTP/Extended slice), so MVP keeps this direct. */
  private emit(record: ThreadRecord, body: PiClientEventBody): void {
    record.seq += 1;
    const event = {
      ...body,
      threadId: record.threadId,
      seq: record.seq,
    } as PiClientEvent;
    for (const listener of [...record.listeners]) {
      try {
        listener(event);
      } catch {
        // A faulty listener must not break delivery to the others.
      }
    }
  }

  private liveStatusFor(threadId: string): PiThreadStatus | undefined {
    const record = this.records.get(threadId);
    return record ? this.runStatus(record) : undefined;
  }

  private runStatus(record: ThreadRecord): PiThreadStatus {
    const session = record.session;
    if (session.isStreaming || session.isCompacting || session.isRetrying) {
      return "running";
    }
    return record.lastError ? "failed" : "idle";
  }

  private readinessOf(record: ThreadRecord): PiRuntimeReadiness {
    const model = record.session.model;
    return deriveReadiness({
      model: model ? { provider: model.provider, id: model.id } : undefined,
      source: "session",
    });
  }

  private queuedMessagesOf(record: ThreadRecord): PiQueuedMessage[] {
    const session = record.session;
    return [
      ...session.getSteeringMessages().map((content, i) => ({
        id: `steer:${i}`,
        mode: "steer" as const,
        content,
      })),
      ...session.getFollowUpMessages().map((content, i) => ({
        id: `followUp:${i}`,
        mode: "followUp" as const,
        content,
      })),
    ];
  }

  private metadataOf(record: ThreadRecord): PiThreadMetadata {
    const session = record.session;
    const model = session.model;
    const usage = session.getContextUsage();
    const queued = this.queuedMessagesOf(record);
    return {
      id: record.threadId,
      status: this.runStatus(record),
      workspacePath: record.workspacePath,
      messageCount: session.messages.length,
      ...(session.sessionName ? { title: session.sessionName } : {}),
      ...(session.sessionFile ? { sessionFile: session.sessionFile } : {}),
      ...(model
        ? {
            config: {
              provider: model.provider,
              modelId: model.id,
              thinkingLevel: session.thinkingLevel,
            },
          }
        : { config: { thinkingLevel: session.thinkingLevel } }),
      ...(usage ? { contextUsage: usage satisfies PiContextUsage } : {}),
      ...(session.sessionFile &&
      this.archivedSessionFiles.has(session.sessionFile)
        ? { archived: true }
        : {}),
      ...(queued.length ? { queuedMessages: queued } : {}),
    };
  }

  private snapshotOf(record: ThreadRecord): PiThreadSnapshot {
    return {
      metadata: this.metadataOf(record),
      messages: toPiMessages(record.session.messages),
      readiness: this.readinessOf(record),
      ...(record.hostUiRequests.length
        ? { hostUiRequests: [...record.hostUiRequests] }
        : {}),
      ...(record.lastError ? { lastError: record.lastError } : {}),
    };
  }

  private snapshotFromSessionFile(info: PiSessionInfo): PiThreadSnapshot {
    const sessionManager = SessionManager.open(info.path);
    const branch = sessionManager.getBranch();
    const context = sessionManager.buildSessionContext();
    const model = context.model
      ? this.modelRegistry.find(context.model.provider, context.model.modelId)
      : undefined;
    const contextUsage = deriveContextUsage(
      model?.contextWindow ?? 0,
      branch,
      context.messages,
    );
    const metadata = mapReadonlyMetadata(info, branch, context, {
      archived: this.archivedSessionFiles.has(info.path),
      contextUsage,
    });
    return {
      metadata,
      messages: toPiMessages(context.messages as never),
      readiness: readinessFromSessionContext(context),
    };
  }
}
