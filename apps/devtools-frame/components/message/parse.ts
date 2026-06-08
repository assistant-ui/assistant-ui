import { extractAttachmentNames, isRecord } from "../common";
import type {
  MessagePreview,
  MessageStatusPreview,
  MessageTimingPreview,
  MessageUsagePreview,
  PartPreview,
  PartStatusPreview,
  ToolCallApprovalPreview,
  ToolCallInterruptPreview,
  ToolCallPartPreview,
} from "./types";

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asBool = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const partKey = (part: PartPreview, index: number) =>
  part.type === "tool-call" && part.toolCallId
    ? `tc:${part.toolCallId}`
    : `p:${index}`;

export const parsePartStatus = (
  value: unknown,
): PartStatusPreview | undefined => {
  if (!isRecord(value)) return undefined;
  const type = asString(value.type);
  if (!type) return undefined;
  const reason = asString(value.reason);
  return {
    type,
    ...(reason ? { reason } : {}),
    ...("error" in value && value.error !== undefined
      ? { error: value.error }
      : {}),
  };
};

const parseInterrupt = (
  value: unknown,
): ToolCallInterruptPreview | undefined => {
  if (!isRecord(value)) return undefined;
  const type = asString(value.type);
  const result: ToolCallInterruptPreview = {
    ...(type ? { type } : {}),
    ...("payload" in value ? { payload: value.payload } : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
};

const parseApproval = (value: unknown): ToolCallApprovalPreview | undefined => {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id);
  const approved = asBool(value.approved);
  const reason = asString(value.reason);
  const isAutomatic = asBool(value.isAutomatic);
  const result: ToolCallApprovalPreview = {
    ...(id ? { id } : {}),
    ...(approved !== undefined ? { approved } : {}),
    ...(reason ? { reason } : {}),
    ...(isAutomatic !== undefined ? { isAutomatic } : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
};

const parseToolCall = (
  value: Record<string, unknown>,
  base: { status?: PartStatusPreview },
): ToolCallPartPreview => {
  const argsText = asString(value.argsText);
  const isError = asBool(value.isError);
  const interrupt = parseInterrupt(value.interrupt);
  const approval = parseApproval(value.approval);
  const subMessageCount = Array.isArray(value.messages)
    ? value.messages.length
    : 0;

  return {
    type: "tool-call",
    toolCallId: asString(value.toolCallId) ?? "",
    toolName: asString(value.toolName) ?? "(unknown)",
    args: value.args,
    hasResult: "result" in value && value.result !== undefined,
    subMessageCount,
    ...(argsText !== undefined ? { argsText } : {}),
    ...("result" in value && value.result !== undefined
      ? { result: value.result }
      : {}),
    ...(isError !== undefined ? { isError } : {}),
    ...(value.artifact !== undefined ? { artifact: value.artifact } : {}),
    ...(value.mcp !== undefined ? { mcp: value.mcp } : {}),
    ...(value.modelContent !== undefined
      ? { modelContent: value.modelContent }
      : {}),
    ...(interrupt ? { interrupt } : {}),
    ...(approval ? { approval } : {}),
    ...base,
  };
};

export const parsePart = (value: unknown): PartPreview => {
  if (!isRecord(value)) {
    return { type: "unknown", rawType: typeof value, raw: value };
  }

  const status = parsePartStatus(value.status);
  const base = status ? { status } : {};
  const type = asString(value.type);

  switch (type) {
    case "text":
      return { type: "text", text: asString(value.text) ?? "", ...base };
    case "reasoning":
      return { type: "reasoning", text: asString(value.text) ?? "", ...base };
    case "source": {
      const sourceType = asString(value.sourceType);
      const title = asString(value.title);
      const url = asString(value.url);
      return {
        type: "source",
        ...(sourceType ? { sourceType } : {}),
        ...(title ? { title } : {}),
        ...(url ? { url } : {}),
        ...base,
      };
    }
    case "image": {
      const filename = asString(value.filename);
      return { type: "image", ...(filename ? { filename } : {}), ...base };
    }
    case "file": {
      const filename = asString(value.filename);
      const mimeType = asString(value.mimeType);
      return {
        type: "file",
        ...(filename ? { filename } : {}),
        ...(mimeType ? { mimeType } : {}),
        ...base,
      };
    }
    case "audio": {
      const audio = isRecord(value.audio) ? value.audio : undefined;
      const format = asString(audio?.format);
      return { type: "audio", ...(format ? { format } : {}), ...base };
    }
    case "data": {
      const name = asString(value.name);
      return {
        type: "data",
        data: value.data,
        ...(name ? { name } : {}),
        ...base,
      };
    }
    case "generative-ui":
      return { type: "generative-ui", spec: value.spec, ...base };
    case "tool-call":
      return parseToolCall(value, base);
    default:
      return {
        type: "unknown",
        rawType: type ?? typeof value,
        raw: value,
        ...base,
      };
  }
};

const parseMessageStatus = (
  value: unknown,
): MessageStatusPreview | undefined => {
  if (!isRecord(value)) return undefined;
  const type = asString(value.type);
  if (!type) return undefined;
  const reason = asString(value.reason);
  return {
    type,
    ...(reason ? { reason } : {}),
    ...("error" in value && value.error !== undefined
      ? { error: value.error }
      : {}),
  };
};

const parseTiming = (value: unknown): MessageTimingPreview | undefined => {
  if (!isRecord(value)) return undefined;

  const streamStartTime = asNumber(value.streamStartTime);
  const firstTokenTime = asNumber(value.firstTokenTime);
  const totalStreamTime = asNumber(value.totalStreamTime);
  const tokenCount = asNumber(value.tokenCount);
  const tokensPerSecond = asNumber(value.tokensPerSecond);
  const totalChunks = asNumber(value.totalChunks);
  const toolCallCount = asNumber(value.toolCallCount);

  const result: MessageTimingPreview = {
    ...(streamStartTime !== undefined ? { streamStartTime } : {}),
    ...(firstTokenTime !== undefined ? { firstTokenTime } : {}),
    ...(totalStreamTime !== undefined ? { totalStreamTime } : {}),
    ...(tokenCount !== undefined ? { tokenCount } : {}),
    ...(tokensPerSecond !== undefined ? { tokensPerSecond } : {}),
    ...(totalChunks !== undefined ? { totalChunks } : {}),
    ...(toolCallCount !== undefined ? { toolCallCount } : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
};

const parseUsage = (value: unknown): MessageUsagePreview | undefined => {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  let inputTokens = 0;
  let outputTokens = 0;
  let sawUsage = false;

  for (const step of value) {
    if (!isRecord(step) || !isRecord(step.usage)) continue;
    const input = asNumber(step.usage.inputTokens);
    const output = asNumber(step.usage.outputTokens);
    if (input !== undefined) {
      inputTokens += input;
      sawUsage = true;
    }
    if (output !== undefined) {
      outputTokens += output;
      sawUsage = true;
    }
  }

  if (!sawUsage) return undefined;
  return { inputTokens, outputTokens, stepCount: value.length };
};

export const parseMessage = (
  value: unknown,
  index: number,
): MessagePreview | null => {
  if (!isRecord(value)) return null;

  const id = asString(value.id) ?? `message-${index}`;
  const role = asString(value.role) ?? "unknown";

  const rawParts = Array.isArray(value.parts)
    ? value.parts
    : Array.isArray(value.content)
      ? value.content
      : [];
  const parts = rawParts.map((part) => parsePart(part));

  const status = parseMessageStatus(value.status);
  const metadata = isRecord(value.metadata) ? value.metadata : undefined;
  const timing = parseTiming(metadata?.timing);
  const usage = parseUsage(metadata?.steps);
  const submittedFeedback = isRecord(metadata?.submittedFeedback)
    ? asString(metadata.submittedFeedback.type)
    : undefined;
  const isOptimistic = asBool(metadata?.isOptimistic);
  const createdAt = asString(value.createdAt);
  const branchNumber = asNumber(value.branchNumber);
  const branchCount = asNumber(value.branchCount);
  const messageIndex = asNumber(value.index);
  const isLast = asBool(value.isLast);

  return {
    id,
    role,
    parts,
    attachments: extractAttachmentNames(value.attachments),
    ...(createdAt ? { createdAt } : {}),
    ...(status ? { status } : {}),
    ...(timing ? { timing } : {}),
    ...(usage ? { usage } : {}),
    ...(branchNumber !== undefined ? { branchNumber } : {}),
    ...(branchCount !== undefined ? { branchCount } : {}),
    ...(messageIndex !== undefined ? { index: messageIndex } : {}),
    ...(isLast !== undefined ? { isLast } : {}),
    ...(isOptimistic !== undefined ? { isOptimistic } : {}),
    ...(submittedFeedback ? { submittedFeedback } : {}),
  };
};
