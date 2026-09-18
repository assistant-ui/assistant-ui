import type {
  FrameMessage,
  SerializedModelContext,
  SerializedTool,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOptionalPropertyType = (
  value: Record<string, unknown>,
  property: string,
  type: "boolean" | "string",
) => value[property] === undefined || typeof value[property] === type;

const isSerializedTool = (value: unknown): value is SerializedTool =>
  isRecord(value) &&
  Object.hasOwn(value, "parameters") &&
  hasOptionalPropertyType(value, "description", "string") &&
  hasOptionalPropertyType(value, "disabled", "boolean") &&
  hasOptionalPropertyType(value, "type", "string");

const isSerializedModelContext = (
  value: unknown,
): value is SerializedModelContext => {
  if (!isRecord(value)) return false;
  if (!hasOptionalPropertyType(value, "system", "string")) return false;
  if (value.tools === undefined) return true;
  if (!isRecord(value.tools)) return false;
  return Object.values(value.tools).every(isSerializedTool);
};

export const isFrameMessage = (value: unknown): value is FrameMessage => {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "model-context-request":
      return true;
    case "model-context-update":
      return isSerializedModelContext(value.context);
    case "tool-call":
      return (
        typeof value.id === "string" &&
        typeof value.toolName === "string" &&
        Object.hasOwn(value, "args")
      );
    case "tool-cancel":
      return typeof value.id === "string";
    case "tool-result":
      return (
        typeof value.id === "string" &&
        (value.error == null || typeof value.error === "string")
      );
    default:
      return false;
  }
};
