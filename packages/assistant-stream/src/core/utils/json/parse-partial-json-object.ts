import sjson from "secure-json-parse";
import { fixJson } from "./fix-json";
import { ReadonlyJSONObject } from "./json-value";

const PARTIAL_ARGS_META_SYMBOL = Symbol("aui.parse-partial-args.meta");

type FieldState = "complete" | "partial";

type PartialJsonObjectMeta = {
  state: "complete" | "partial";
  partialCount: number;
};

export const getPartialJsonObjectMeta = (
  obj: unknown,
): PartialJsonObjectMeta | undefined => {
  return (obj as Record<symbol, unknown>)?.[
    PARTIAL_ARGS_META_SYMBOL
  ] as PartialJsonObjectMeta;
};

export const parsePartialJsonObject = (
  argsText: string,
):
  | (ReadonlyJSONObject & { [PARTIAL_ARGS_META_SYMBOL]: PartialJsonObjectMeta })
  | undefined => {
  if (argsText.length === 0)
    return {
      [PARTIAL_ARGS_META_SYMBOL]: { state: "partial", partialCount: 1 },
    };

  try {
    const res = sjson.parse(argsText);
    if (typeof res !== "object" || res === null)
      throw new Error("argsText is expected to be an object");

    res[PARTIAL_ARGS_META_SYMBOL] = { state: "complete", partialCount: 0 };
    return res;
  } catch {
    try {
      const [fixedJson, partialCount] = fixJson(argsText);
      const res = sjson.parse(fixedJson);
      if (typeof res !== "object" || res === null)
        throw new Error("argsText is expected to be an object");

      res[PARTIAL_ARGS_META_SYMBOL] = { state: "partial", partialCount };
      return res;
    } catch {
      return undefined;
    }
  }
};

const getFieldState = (
  args: unknown,
  argsMeta: PartialJsonObjectMeta,
  fieldPath: (string | number)[],
): FieldState => {
  if (typeof args !== "object" || args === null) return argsMeta.state;

  if (argsMeta.state === "complete") return "complete";
  if (fieldPath.length === 0) return "partial";

  const [field, ...restFields] = fieldPath as [
    string | number,
    ...(string | number)[],
  ];

  // Check if the current path exists in args
  if (!Object.prototype.hasOwnProperty.call(args, field)) return "partial";

  const argsKeys = Object.keys(args);
  const isLast = argsKeys[argsKeys.length - 1] === field;
  if (!isLast) return "complete";

  const value = (args as Record<string | number, unknown>)[field];

  const innerState: PartialJsonObjectMeta = {
    state: argsMeta.partialCount > 1 ? "partial" : "complete",
    partialCount: argsMeta.partialCount - 1,
  };

  return getFieldState(value, innerState, restFields);
};

export const getPartialJsonObjectFieldState = (
  args: Record<string, unknown>,
  fieldPath: (string | number)[],
): FieldState => {
  const meta = getPartialJsonObjectMeta(args);
  if (!meta) throw new Error("unable to determine args state");

  return getFieldState(args, meta, fieldPath);
};
