import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";
import type {
  Unstable_ToolInteraction,
  Unstable_ToolInteractionInput,
  Unstable_ToolInteractionLog,
} from "../../types/message";

export const TOOL_INTERACTION_LIMITS = {
  entries: 32,
  payloadLength: 16_384,
  logLength: 65_536,
} as const;

const MAX_DEPTH = 64;

const isPlainObject = (value: object): boolean => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isPlainJSON = (
  value: unknown,
  ancestors: Set<object>,
  depth: number,
): value is ReadonlyJSONValue => {
  if (value === null) return true;
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      break;
    default:
      return false;
  }
  if (depth > MAX_DEPTH || ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Array.isArray(value)
    ? value.every((item) => isPlainJSON(item, ancestors, depth + 1))
    : isPlainObject(value) &&
      Object.values(value).every((item) =>
        isPlainJSON(item, ancestors, depth + 1),
      );
  ancestors.delete(value);
  return valid;
};

const isJSONObjectValue = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInteractionType = (
  value: unknown,
): value is Unstable_ToolInteraction["type"] =>
  value === "action" || value === "human-response";

export function createToolInteraction(
  input: Unstable_ToolInteractionInput,
  occurredAt: number = Date.now(),
): Unstable_ToolInteraction {
  const { type, payload } = input;
  if (!isInteractionType(type)) {
    throw new Error(`Unknown tool interaction type: ${String(type)}`);
  }
  if (!isPlainJSON(payload, new Set(), 0)) {
    throw new Error("A tool interaction payload must be plain JSON.");
  }
  if (type === "action" && !isJSONObjectValue(payload)) {
    throw new Error("An action interaction payload must be a JSON object.");
  }
  const serialized = JSON.stringify(payload);
  if (serialized.length > TOOL_INTERACTION_LIMITS.payloadLength) {
    throw new Error(
      `A tool interaction payload is limited to ${TOOL_INTERACTION_LIMITS.payloadLength} characters of JSON.`,
    );
  }
  return { type, occurredAt, payload: JSON.parse(serialized) };
}

export function appendToolInteraction(
  log: Unstable_ToolInteractionLog | undefined,
  interaction: Unstable_ToolInteraction,
): Unstable_ToolInteractionLog {
  const entries = [...(log?.entries ?? []), interaction];
  let omitted = log?.omitted ?? 0;
  while (
    entries.length > 1 &&
    (entries.length > TOOL_INTERACTION_LIMITS.entries ||
      JSON.stringify(entries).length > TOOL_INTERACTION_LIMITS.logLength)
  ) {
    entries.shift();
    omitted += 1;
  }
  return omitted > 0 ? { entries, omitted } : { entries };
}

const readInteraction = (
  value: unknown,
): Unstable_ToolInteraction | undefined => {
  if (!isJSONObjectValue(value)) return undefined;
  const { type, occurredAt, payload } = value as Record<string, unknown>;
  if (!isInteractionType(type)) return undefined;
  if (typeof occurredAt !== "number" || !Number.isFinite(occurredAt)) {
    return undefined;
  }
  if (!isPlainJSON(payload, new Set(), 0)) return undefined;
  if (type === "action") {
    return isJSONObjectValue(payload)
      ? { type, occurredAt, payload: payload as ReadonlyJSONObject }
      : undefined;
  }
  return { type, occurredAt, payload };
};

export function readToolInteractionLog(
  value: unknown,
): Unstable_ToolInteractionLog | undefined {
  if (!isJSONObjectValue(value)) return undefined;
  const { entries, omitted } = value as Record<string, unknown>;
  const readable = Array.isArray(entries)
    ? entries.flatMap((entry) => {
        const interaction = readInteraction(entry);
        return interaction ? [interaction] : [];
      })
    : [];
  const omittedCount =
    typeof omitted === "number" && Number.isInteger(omitted) && omitted > 0
      ? omitted
      : 0;
  let omittedEntries = omittedCount;
  while (
    readable.length > 1 &&
    (readable.length > TOOL_INTERACTION_LIMITS.entries ||
      JSON.stringify(readable).length > TOOL_INTERACTION_LIMITS.logLength)
  ) {
    readable.shift();
    omittedEntries += 1;
  }
  if (readable.length === 0 && omittedEntries === 0) return undefined;
  return omittedEntries > 0
    ? { entries: readable, omitted: omittedEntries }
    : { entries: readable };
}
