import type {
  AgUiEvent,
  AgUiInterrupt,
  AgUiRunFinishedOutcome,
  AgUiSubagentFinishedOutcome,
} from "./types";
import type { Logger } from "./logger";
import { parseMcpToolCallResult } from "./mcp-tool-result";
import { withRawResponseSchema } from "./interrupt-internals";

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

const logRejectedEvent = (
  logger: Logger | undefined,
  type: unknown,
  payload: unknown,
  reason: string,
) => {
  const typeLabel = isString(type) ? type : "unknown";
  logger?.debug?.(`[agui] ${typeLabel} ${reason}`, payload);
};

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
  // A present schema is kept whatever its shape: `false` is a JSON Schema that
  // rejects every payload, so normalizing it to absent would claim a gate no
  // decision can answer. Only an object schema fits `responseSchema`; every
  // other shape travels on the internal carrier. `null` is not a JSON Schema at
  // all, and it is what a server serializing an unset optional field sends, so
  // it reads as absent rather than as a schema nothing can satisfy.
  return raw.responseSchema == null || isPlainObject(raw.responseSchema)
    ? interrupt
    : withRawResponseSchema(interrupt, raw.responseSchema);
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
  if (!event || typeof event !== "object") {
    logRejectedEvent(options?.logger, undefined, event, "is not an object");
    return null;
  }
  const payload = event as Record<string, unknown>;
  const typeValue = payload.type;
  if (!isString(typeValue)) {
    logRejectedEvent(options?.logger, typeValue, payload, "has no string type");
    return null;
  }

  const reject = (reason: string): null => {
    logRejectedEvent(options?.logger, typeValue, payload, reason);
    return null;
  };

  const getString = (key: string) =>
    isString(payload[key]) ? (payload[key] as string) : undefined;

  switch (typeValue) {
    case "RUN_STARTED": {
      const runId = getString("runId");
      return runId ? { type: "RUN_STARTED", runId } : reject("missing runId");
    }
    case "RUN_FINISHED": {
      const runId = getString("runId");
      if (!runId) return reject("missing runId");
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
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    case "TEXT_MESSAGE_CONTENT": {
      const delta = getString("delta");
      if (!isNonEmptyString(delta)) return reject("missing non-empty delta");
      return withOptional(
        { type: "TEXT_MESSAGE_CONTENT" as const, delta },
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    }
    case "TEXT_MESSAGE_END":
      return withOptional(
        { type: "TEXT_MESSAGE_END" as const },
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    case "TEXT_MESSAGE_CHUNK": {
      const delta = getString("delta") ?? "";
      return withOptional(
        { type: "TEXT_MESSAGE_CHUNK" as const, delta },
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
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
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    case "REASONING_MESSAGE_START":
      return withOptional(
        { type: "REASONING_MESSAGE_START" as const },
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    case "REASONING_MESSAGE_CONTENT": {
      const delta = getString("delta") ?? "";
      return withOptional(
        { type: "REASONING_MESSAGE_CONTENT" as const, delta },
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    }
    case "REASONING_MESSAGE_END":
      return withOptional(
        { type: "REASONING_MESSAGE_END" as const },
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    case "REASONING_ENCRYPTED_VALUE": {
      const entityId = getString("entityId");
      const encryptedValue = getString("encryptedValue");
      const subtype = getString("subtype");
      if (!entityId || !encryptedValue) {
        return reject("missing entityId or encryptedValue");
      }
      if (subtype !== "message" && subtype !== "tool-call") {
        return reject("has an invalid subtype");
      }
      // Spread rather than withOptional: routing the narrowed `subtype` through
      // a generic helper widens it back to string.
      const subagentRunId = getString("subagentRunId");
      return {
        type: "REASONING_ENCRYPTED_VALUE" as const,
        subtype,
        entityId,
        encryptedValue,
        ...(subagentRunId !== undefined ? { subagentRunId } : {}),
      };
    }
    case "REASONING_END":
      return withOptional(
        { type: "REASONING_END" as const },
        {
          messageId: getString("messageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    case "TOOL_CALL_START": {
      const toolCallId = getString("toolCallId");
      if (!toolCallId) return reject("missing toolCallId");
      return withOptional(
        { type: "TOOL_CALL_START" as const, toolCallId },
        {
          toolCallName: getString("toolCallName"),
          parentMessageId: getString("parentMessageId"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    }
    case "TOOL_CALL_ARGS": {
      const toolCallId = getString("toolCallId");
      if (!toolCallId) return reject("missing toolCallId");
      const delta = getString("delta") ?? "";
      return withOptional(
        { type: "TOOL_CALL_ARGS" as const, toolCallId, delta },
        { subagentRunId: getString("subagentRunId") },
      );
    }
    case "TOOL_CALL_END": {
      const toolCallId = getString("toolCallId");
      if (!toolCallId) return reject("missing toolCallId");
      return withOptional(
        { type: "TOOL_CALL_END" as const, toolCallId },
        { subagentRunId: getString("subagentRunId") },
      );
    }
    case "TOOL_CALL_CHUNK":
      return withOptional(
        { type: "TOOL_CALL_CHUNK" as const },
        {
          toolCallId: getString("toolCallId"),
          toolCallName: getString("toolCallName"),
          parentMessageId: getString("parentMessageId"),
          delta: getString("delta"),
          subagentRunId: getString("subagentRunId"),
        },
      );
    case "TOOL_CALL_RESULT": {
      const toolCallId = getString("toolCallId");
      if (!toolCallId) return reject("missing toolCallId");
      const content = getString("content") ?? "";
      return withOptional(
        {
          type: "TOOL_CALL_RESULT" as const,
          toolCallId,
          content,
        },
        {
          messageId: getString("messageId"),
          role: payload.role === "tool" ? "tool" : undefined,
          mcpResult: parseMcpToolCallResult(payload, content),
          subagentRunId: getString("subagentRunId"),
        },
      );
    }
    case "STATE_SNAPSHOT":
      if (payload.snapshot === undefined) {
        return reject("missing snapshot");
      }
      return { type: "STATE_SNAPSHOT", snapshot: payload.snapshot };
    case "STATE_DELTA":
      return {
        type: "STATE_DELTA",
        delta: Array.isArray(payload.delta) ? (payload.delta as any[]) : [],
      };
    case "MESSAGES_SNAPSHOT":
      if (!Array.isArray(payload.messages)) {
        return reject("missing messages array");
      }
      return {
        type: "MESSAGES_SNAPSHOT",
        messages: payload.messages as any[],
      };
    case "ACTIVITY_SNAPSHOT": {
      const activityType = getString("activityType");
      if (!activityType || !isPlainObject(payload.content)) {
        return reject("missing activityType or object content");
      }
      return withOptional(
        {
          type: "ACTIVITY_SNAPSHOT" as const,
          activityType,
          content: payload.content,
        },
        {
          messageId: getString("messageId"),
          replace:
            typeof payload.replace === "boolean" ? payload.replace : undefined,
          subagentRunId: getString("subagentRunId"),
        },
      );
    }
    case "RAW":
      return withOptional(
        { type: "RAW" as const, event: payload.event },
        { source: getString("source") },
      );
    case "CUSTOM": {
      const name = getString("name");
      if (!name) return reject("missing name");
      return { type: "CUSTOM", name, value: payload.value };
    }
    case "SUBAGENT_STARTED": {
      const subagentRunId = getString("subagentRunId");
      const name = getString("name");
      if (!subagentRunId || !name) {
        return reject("missing subagentRunId or name");
      }
      return withOptional(
        { type: "SUBAGENT_STARTED" as const, subagentRunId, name },
        {
          description: getString("description"),
          parentSubagentRunId: getString("parentSubagentRunId"),
          parentToolCallId: getString("parentToolCallId"),
          parentMessageId: getString("parentMessageId"),
        },
      );
    }
    case "SUBAGENT_FINISHED": {
      const subagentRunId = getString("subagentRunId");
      if (!subagentRunId) return reject("missing subagentRunId");
      const rawOutcome = payload.outcome;
      let outcome: AgUiSubagentFinishedOutcome | undefined;
      if (!isPlainObject(rawOutcome)) {
        outcome = undefined;
      } else if (rawOutcome.type === "success") {
        outcome = { type: "success" as const };
      } else if (rawOutcome.type === "suspended") {
        outcome = withOptional(
          { type: "suspended" as const },
          {
            interruptIds: Array.isArray(rawOutcome.interruptIds)
              ? (rawOutcome.interruptIds as unknown[]).filter(isString)
              : undefined,
          },
        );
      } else {
        outcome = undefined;
      }
      return withOptional(
        { type: "SUBAGENT_FINISHED" as const, subagentRunId },
        { result: payload.result, outcome },
      );
    }
    case "SUBAGENT_ERROR": {
      const subagentRunId = getString("subagentRunId");
      const message = getString("message");
      if (!subagentRunId || !message) {
        return reject("missing subagentRunId or message");
      }
      return withOptional(
        { type: "SUBAGENT_ERROR" as const, subagentRunId, message },
        { code: getString("code") },
      );
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
