import type { AgUiEvent, AgUiInterrupt, AgUiRunFinishedOutcome } from "./types";
import type { Logger } from "./logger";

export type ParseAgUiEventOptions = {
  logger?: Logger;
};

const isString = (value: unknown): value is string => typeof value === "string";
const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.length > 0;

const withOptional = <T extends object>(
  base: T,
  optionals: Record<string, unknown>,
) => {
  const definedEntries = Object.entries(optionals).filter(
    ([, value]) => value !== undefined,
  );
  return definedEntries.length === 0
    ? base
    : ({ ...base, ...Object.fromEntries(definedEntries) } as T);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const parseInterrupt = (raw: unknown): AgUiInterrupt | null => {
  if (!isPlainObject(raw)) return null;
  const id = raw.id;
  const reason = raw.reason;
  if (typeof id !== "string" || typeof reason !== "string") return null;
  const interrupt: AgUiInterrupt = { id, reason };
  if (typeof raw.message === "string") interrupt.message = raw.message;
  if (typeof raw.toolCallId === "string") interrupt.toolCallId = raw.toolCallId;
  if (typeof raw.expiresAt === "string") interrupt.expiresAt = raw.expiresAt;
  if (isPlainObject(raw.responseSchema))
    interrupt.responseSchema = raw.responseSchema;
  if (isPlainObject(raw.metadata)) interrupt.metadata = raw.metadata;
  return interrupt;
};

const parseRunFinishedOutcome = (
  raw: unknown,
  logger: Logger | undefined,
): AgUiRunFinishedOutcome | undefined => {
  if (!isPlainObject(raw)) return undefined;
  if (raw.type === "success") return { type: "success" };
  if (raw.type === "interrupt") {
    if (!Array.isArray(raw.interrupts)) {
      logger?.debug?.(
        "[agui] RUN_FINISHED interrupt outcome missing interrupts array",
        raw,
      );
      return undefined;
    }
    const parsed = raw.interrupts
      .map((entry) => parseInterrupt(entry))
      .filter((entry): entry is AgUiInterrupt => entry !== null);
    if (parsed.length === 0) {
      logger?.debug?.(
        "[agui] RUN_FINISHED interrupt outcome has no valid interrupts",
        raw.interrupts,
      );
      return undefined;
    }
    return { type: "interrupt", interrupts: parsed };
  }
  return undefined;
};

export const parseAgUiEvent = (
  event: unknown,
  options?: ParseAgUiEventOptions,
): AgUiEvent | null => {
  if (!event || typeof event !== "object") return null;
  const payload = event as Record<string, unknown>;
  const typeValue = payload.type;
  if (!isString(typeValue)) return null;

  const getString = (key: string) =>
    isString(payload[key]) ? (payload[key] as string) : undefined;

  switch (typeValue) {
    case "RUN_STARTED": {
      const runId = getString("runId");
      return runId ? { type: "RUN_STARTED", runId } : null;
    }
    case "RUN_FINISHED": {
      const runId = getString("runId");
      if (!runId) return null;
      return withOptional(
        { type: "RUN_FINISHED" as const, runId },
        {
          outcome: parseRunFinishedOutcome(payload.outcome, options?.logger),
        },
      );
    }
    case "RUN_CANCELLED": {
      const runId = getString("runId");
      return withOptional({ type: "RUN_CANCELLED" as const }, { runId });
    }
    case "RUN_ERROR": {
      return withOptional(
        { type: "RUN_ERROR" as const },
        {
          message: getString("message"),
          code: getString("code"),
        },
      );
    }
    case "TEXT_MESSAGE_START":
      return withOptional(
        { type: "TEXT_MESSAGE_START" as const },
        { messageId: getString("messageId") },
      );
    case "TEXT_MESSAGE_CONTENT": {
      const delta = getString("delta");
      if (!isNonEmptyString(delta)) return null;
      return withOptional(
        { type: "TEXT_MESSAGE_CONTENT" as const, delta },
        { messageId: getString("messageId") },
      );
    }
    case "TEXT_MESSAGE_END":
      return withOptional(
        { type: "TEXT_MESSAGE_END" as const },
        { messageId: getString("messageId") },
      );
    case "TEXT_MESSAGE_CHUNK": {
      const delta = getString("delta") ?? "";
      return withOptional(
        { type: "TEXT_MESSAGE_CHUNK" as const, delta },
        { messageId: getString("messageId") },
      );
    }
    case "THINKING_START":
      return withOptional(
        { type: "THINKING_START" as const },
        { title: getString("title") },
      );
    case "THINKING_TEXT_MESSAGE_START":
      return { type: "THINKING_TEXT_MESSAGE_START" };
    case "THINKING_TEXT_MESSAGE_CONTENT": {
      const delta = getString("delta") ?? "";
      return { type: "THINKING_TEXT_MESSAGE_CONTENT", delta };
    }
    case "THINKING_TEXT_MESSAGE_END":
      return { type: "THINKING_TEXT_MESSAGE_END" };
    case "THINKING_END":
      return { type: "THINKING_END" };
    case "REASONING_START":
      return withOptional(
        { type: "REASONING_START" as const },
        { messageId: getString("messageId") },
      );
    case "REASONING_MESSAGE_START":
      return withOptional(
        { type: "REASONING_MESSAGE_START" as const },
        { messageId: getString("messageId") },
      );
    case "REASONING_MESSAGE_CONTENT": {
      const delta = getString("delta") ?? "";
      return withOptional(
        { type: "REASONING_MESSAGE_CONTENT" as const, delta },
        { messageId: getString("messageId") },
      );
    }
    case "REASONING_MESSAGE_END":
      return withOptional(
        { type: "REASONING_MESSAGE_END" as const },
        { messageId: getString("messageId") },
      );
    case "REASONING_END":
      return withOptional(
        { type: "REASONING_END" as const },
        { messageId: getString("messageId") },
      );
    case "TOOL_CALL_START": {
      const toolCallId = getString("toolCallId");
      if (!toolCallId) return null;
      return withOptional(
        { type: "TOOL_CALL_START" as const, toolCallId },
        {
          toolCallName: getString("toolCallName"),
          parentMessageId: getString("parentMessageId"),
        },
      );
    }
    case "TOOL_CALL_ARGS": {
      const toolCallId = getString("toolCallId");
      if (!toolCallId) return null;
      const delta = getString("delta") ?? "";
      return { type: "TOOL_CALL_ARGS", toolCallId, delta };
    }
    case "TOOL_CALL_END": {
      const toolCallId = getString("toolCallId");
      return toolCallId ? { type: "TOOL_CALL_END", toolCallId } : null;
    }
    case "TOOL_CALL_CHUNK":
      return withOptional(
        { type: "TOOL_CALL_CHUNK" as const },
        {
          toolCallId: getString("toolCallId"),
          toolCallName: getString("toolCallName"),
          parentMessageId: getString("parentMessageId"),
          delta: getString("delta"),
        },
      );
    case "TOOL_CALL_RESULT": {
      const toolCallId = getString("toolCallId");
      if (!toolCallId) return null;
      return withOptional(
        {
          type: "TOOL_CALL_RESULT" as const,
          toolCallId,
          content: getString("content") ?? "",
        },
        {
          messageId: getString("messageId"),
          role: payload.role === "tool" ? "tool" : undefined,
        },
      );
    }
    case "STATE_SNAPSHOT":
      return { type: "STATE_SNAPSHOT", snapshot: payload.snapshot };
    case "STATE_DELTA":
      return {
        type: "STATE_DELTA",
        delta: Array.isArray(payload.delta) ? (payload.delta as any[]) : [],
      };
    case "MESSAGES_SNAPSHOT":
      return {
        type: "MESSAGES_SNAPSHOT",
        messages: Array.isArray(payload.messages)
          ? (payload.messages as any[])
          : [],
      };
    case "ACTIVITY_SNAPSHOT": {
      const activityType = getString("activityType");
      if (!activityType || !isPlainObject(payload.content)) return null;
      return {
        type: "ACTIVITY_SNAPSHOT" as const,
        activityType,
        content: payload.content,
      };
    }
    case "RAW":
      return withOptional(
        { type: "RAW" as const, event: payload.event },
        { source: getString("source") },
      );
    case "CUSTOM": {
      const name = getString("name");
      if (!name) return null;
      return { type: "CUSTOM", name, value: payload.value };
    }
    default:
      return withOptional(
        { type: "RAW" as const, event: payload },
        {
          source: isString(payload.type) ? (payload.type as string) : undefined,
        },
      );
  }
};
