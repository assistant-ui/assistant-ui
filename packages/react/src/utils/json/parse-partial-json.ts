import sjson from "secure-json-parse";
import { fixJson } from "./fix-json";
import {
  ContentPartStatus,
  ToolCallContentPartStatus,
} from "../../types/AssistantTypes";
import { useContentPart } from "../../context";

const PARTIAL_JSON_COUNT_SYMBOL = Symbol("partial-json-count");
export const parsePartialJson = (json: string) => {
  try {
    return sjson.parse(json);
  } catch {
    try {
      const [fixedJson, partialCount] = fixJson(json);
      const res = sjson.parse(fixedJson);
      res[PARTIAL_JSON_COUNT_SYMBOL] = partialCount;
      return res;
    } catch {
      return undefined;
    }
  }
};

const COMPLETE_STATUS = Object.freeze({ type: "complete" });

const getFieldStatus = (
  lastState: ContentPartStatus,
  args: unknown,
  fieldPath: string[],
  partialCount: number,
): ContentPartStatus => {
  if (fieldPath.length === 0) return lastState;
  if (typeof args !== "object" || args === null) return COMPLETE_STATUS;

  const path = fieldPath.at(-1)!;

  // If the expected property does not exist, mark as incomplete
  if (!Object.prototype.hasOwnProperty.call(args, path)) {
    return lastState;
  }

  const argsKeys = Object.keys(args);
  const isLast = argsKeys[argsKeys.length - 1] === path;
  if (!isLast) return COMPLETE_STATUS;

  return getFieldStatus(
    lastState,
    (args as Record<string, unknown>)[path],
    fieldPath.slice(0, -1),
    partialCount - 1,
  );
};

const getToolArgsFieldStatus = (
  status: ToolCallContentPartStatus,
  args: Record<string, unknown>,
  fieldPath: string[],
): ContentPartStatus => {
  const partialCount = (args as any)[PARTIAL_JSON_COUNT_SYMBOL] ?? 0;
  if (partialCount === 0) return COMPLETE_STATUS;

  const lastState: ContentPartStatus =
    status.type !== "requires-action" ? status : COMPLETE_STATUS;

  return getFieldStatus(lastState, args, fieldPath, partialCount);
};

export const useToolArgsFieldStatus = (fieldPath: string[]) => {
  return useContentPart((p) => {
    if (p.type !== "tool-call") throw new Error("not a tool call");
    return getToolArgsFieldStatus(p.status, p.args, fieldPath);
  });
};
