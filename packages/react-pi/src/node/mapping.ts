/**
 * Pure mappers from real Pi SDK shapes to the JSON-safe mirror in `types`.
 *
 * Node-reachable, but RUNTIME-PURE: every Pi import here is `import type`, so
 * nothing pulls `@earendil-works/pi-*` into a JS bundle. These functions are the
 * testable seam of the node host — exercised with hand-built fakes in
 * `mapping.test.ts`, no live `AgentSession` required.
 *
 * The mirror in `types` is structurally faithful to Pi `0.78` (verified
 * against the real `.d.ts`), so most of the mapping is an identity cast at the
 * type boundary plus the few places the supervisor must enrich (turn index, live
 * run status, readiness).
 */
import type {
  AgentSessionEvent,
  ModelRegistry,
  SessionEntry,
  SessionInfo,
} from "@earendil-works/pi-coding-agent";
import type {
  PiAgentMessage,
  PiAssistantMessageDelta,
  PiClientEventBody,
  PiContextUsage,
  PiModelInfo,
  PiRuntimeReadiness,
  PiThinkingLevel,
  PiThreadMetadata,
  PiThreadStatus,
  PiTranscriptMessage,
} from "../types";

/** A model as the `ModelRegistry` reports it (a Pi `Model`), derived from the
 *  SDK so this module names it only at the type boundary. */
export type PiRegistryModel = ReturnType<ModelRegistry["getAll"]>[number];

const THINKING_LEVELS: readonly PiThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];

/**
 * The real Pi `AgentMessage` / `AssistantMessageEvent`, derived from the event
 * union so we depend only on the declared `@earendil-works/pi-coding-agent`
 * package (not its transitive `pi-agent-core` / `pi-ai`).
 */
type PiSdkMessage = Extract<
  AgentSessionEvent,
  { type: "message_start" }
>["message"];

/** Cast a real Pi message into the mirror. The shapes are structurally faithful
 * (verified), so this is a type-boundary identity — never a conversion. */
export const toPiMessage = (message: PiSdkMessage): PiTranscriptMessage =>
  message as unknown as PiAgentMessage;

export const toPiMessages = (
  messages: readonly PiSdkMessage[],
): PiTranscriptMessage[] => messages.map(toPiMessage);

/** Last path segment, cross-platform, without pulling in `node:path`. */
const baseName = (filePath: string): string => {
  const segments = filePath.split(/[\\/]/);
  return segments[segments.length - 1] ?? filePath;
};

/**
 * Map Pi's session-level event stream (`AgentSession.subscribe`) onto the
 * JSON-safe `PiClientEventBody`. `agent_start` / `tool_execution_*` / `message_*`
 * carry through unchanged; the variants Pi renamed or enriched are normalized
 * here. `turn_start` / `turn_end` carry no index in the SDK — the supervisor
 * derives and passes one via `ctx.turnIndex`.
 *
 * Note: `error`, `context_usage`, and `extension_ui_request` / `_resolved` are
 * NOT in this stream — the supervisor synthesizes them (from caught errors,
 * `getContextUsage()`, and the extension-UI bridge respectively).
 */
export const mapSessionEvent = (
  event: AgentSessionEvent,
  ctx: { turnIndex: number },
): PiClientEventBody => {
  switch (event.type) {
    case "agent_start":
      return { type: "agent_start" };
    case "agent_end":
      return { type: "agent_end", willRetry: event.willRetry };
    case "turn_start":
      return { type: "turn_start", turnIndex: ctx.turnIndex };
    case "turn_end":
      return { type: "turn_end", turnIndex: ctx.turnIndex };
    case "message_start":
      return { type: "message_start", message: toPiMessage(event.message) };
    case "message_update":
      return {
        type: "message_update",
        message: toPiMessage(event.message),
        assistantMessageEvent:
          event.assistantMessageEvent as unknown as PiAssistantMessageDelta,
      };
    case "message_end":
      return { type: "message_end", message: toPiMessage(event.message) };
    case "tool_execution_start":
      return {
        type: "tool_execution_start",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args,
      };
    case "tool_execution_update":
      return {
        type: "tool_execution_update",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        partialResult: event.partialResult,
      };
    case "tool_execution_end":
      return {
        type: "tool_execution_end",
        toolCallId: event.toolCallId,
        result: event.result,
        isError: event.isError,
      };
    case "queue_update":
      return {
        type: "queue_update",
        steering: event.steering,
        followUp: event.followUp,
      };
    case "compaction_start":
      return { type: "compaction_start", reason: event.reason };
    case "compaction_end":
      return {
        type: "compaction_end",
        aborted: event.aborted,
        willRetry: event.willRetry,
      };
    case "session_info_changed":
      return event.name === undefined
        ? { type: "session_info_changed" }
        : { type: "session_info_changed", name: event.name };
    case "thinking_level_changed":
      return { type: "thinking_level_changed", level: event.level };
    case "auto_retry_start":
      return {
        type: "auto_retry_start",
        attempt: event.attempt,
        delayMs: event.delayMs,
      };
    case "auto_retry_end":
      return { type: "auto_retry_end", success: event.success };
    default:
      // Forward-compat: a future Pi event type the union doesn't yet name. Pass
      // the bare type through so the controller's unknown-event fallback can
      // full-refresh rather than silently dropping it. `event` is `never` here
      // per the current closed union, hence the cast.
      return {
        type: (event as { type: string }).type,
      } as unknown as PiClientEventBody;
  }
};

/** Map a `SessionManager` catalog entry onto thread-list metadata. Live status
 * (from the supervisor's running records) is merged over the catalog default. */
export const mapSessionInfo = (
  info: SessionInfo,
  opts?: { liveStatus?: PiThreadStatus },
): PiThreadMetadata => {
  const title =
    info.name?.trim() ||
    info.firstMessage.slice(0, 60).trim() ||
    baseName(info.path);
  return {
    id: info.id,
    status: opts?.liveStatus ?? "idle",
    sessionFile: info.path,
    messageCount: info.messageCount,
    createdAt: info.created.toISOString(),
    updatedAt: info.modified.toISOString(),
    ...(title ? { title } : {}),
    ...(info.cwd ? { workspacePath: info.cwd } : {}),
    ...(info.parentSessionPath
      ? { parentSessionPath: info.parentSessionPath }
      : {}),
  };
};

/**
 * Derive model/credential readiness. Only the two cheaply-knowable states are
 * surfaced: a model is selected (`ready`) or none is (`missing-model`).
 * `missing-credentials` / `unavailable-model` are detected lazily when a send
 * fails and routed into `lastError` — we do not probe the provider eagerly.
 */
export const deriveReadiness = (input: {
  model?: { provider: string; id: string } | undefined;
  source?: "env" | "session" | "pi-default";
}): PiRuntimeReadiness => {
  if (!input.model) {
    return {
      state: "missing-model",
      message:
        "No model selected. Set PI_PROVIDER + PI_MODEL_ID (or configure a Pi default) and restart the host.",
    };
  }
  return {
    state: "ready",
    selection: { provider: input.model.provider, modelId: input.model.id },
    source: input.source ?? "session",
  };
};

/** Map a registry model onto the JSON-safe `PiModelInfo`. */
export const mapModelInfo = (model: PiRegistryModel): PiModelInfo => {
  const map = model.thinkingLevelMap as
    | Partial<Record<PiThinkingLevel, unknown>>
    | undefined;
  const availableThinkingLevels = map
    ? THINKING_LEVELS.filter((level) => map[level] !== null)
    : undefined;
  return {
    provider: String(model.provider),
    modelId: model.id,
    ...(model.name ? { name: model.name } : {}),
    supportsThinking: Boolean(model.reasoning),
    ...(availableThinkingLevels ? { availableThinkingLevels } : {}),
  };
};

/** The readonly view a `SessionManager` exposes for a cold (non-live) thread. */
export type ReadonlySessionContext = {
  messages: readonly unknown[];
  thinkingLevel: string;
  model: { provider: string; modelId: string } | null;
};

/** Latest session name from the branch (newest `session_info` entry wins). */
export const latestSessionName = (
  branch: readonly SessionEntry[],
): string | undefined => {
  for (let index = branch.length - 1; index >= 0; index -= 1) {
    const entry = branch[index]!;
    if (entry.type === "session_info") return entry.name;
  }
  return undefined;
};

/** Readiness for a cold thread, from its persisted model selection. */
export const readinessFromSessionContext = (
  context: Pick<ReadonlySessionContext, "model">,
): PiRuntimeReadiness =>
  deriveReadiness({
    model: context.model
      ? { provider: context.model.provider, id: context.model.modelId }
      : undefined,
    source: "session",
  });

/**
 * Metadata for a cold (non-live) thread, derived from its session file. The
 * supervisor injects what only it can know: whether the file is archived, and
 * the context usage (which needs the model registry's context window).
 */
export const mapReadonlyMetadata = (
  info: SessionInfo,
  branch: readonly SessionEntry[],
  context: ReadonlySessionContext,
  opts: { archived: boolean; contextUsage?: PiContextUsage | undefined },
): PiThreadMetadata => {
  const sessionName = latestSessionName(branch);
  const base = mapSessionInfo(info, { liveStatus: "idle" });
  return {
    ...base,
    ...(sessionName !== undefined ? { title: sessionName } : {}),
    ...(context.model
      ? {
          config: {
            provider: context.model.provider,
            modelId: context.model.modelId,
            thinkingLevel: context.thinkingLevel,
          },
        }
      : { config: { thinkingLevel: context.thinkingLevel } }),
    messageCount: context.messages.length,
    ...(opts.contextUsage ? { contextUsage: opts.contextUsage } : {}),
    ...(opts.archived ? { archived: true } : {}),
  };
};
