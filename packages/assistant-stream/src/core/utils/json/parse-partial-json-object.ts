import sjson from "secure-json-parse";
import { fixJson } from "./fix-json";
import { ReadonlyJSONObject } from "./json-value";

const PARTIAL_JSON_OBJECT_META_SYMBOL = Symbol(
  "aui.parse-partial-json-object.meta",
);

type FieldState = "complete" | "partial";

type PartialJsonObjectMeta = {
  state: "complete" | "partial";
  partialPath: string[];
};

export const getPartialJsonObjectMeta = (
  obj: Record<symbol, unknown>,
): PartialJsonObjectMeta | undefined => {
  return obj?.[PARTIAL_JSON_OBJECT_META_SYMBOL] as PartialJsonObjectMeta;
};

export const parsePartialJsonObject = (
  json: string,
):
  | (ReadonlyJSONObject & {
      [PARTIAL_JSON_OBJECT_META_SYMBOL]: PartialJsonObjectMeta;
    })
  | undefined => {
  if (json.length === 0)
    return {
      [PARTIAL_JSON_OBJECT_META_SYMBOL]: { state: "partial", partialPath: [] },
    };

  try {
    const res = sjson.parse(json);
    if (typeof res !== "object" || res === null)
      throw new Error("argsText is expected to be an object");

    res[PARTIAL_JSON_OBJECT_META_SYMBOL] = {
      state: "complete",
      partialPath: [],
    };
    return res;
  } catch {
    try {
      const [fixedJson, partialPath] = fixJson(json);
      const res = sjson.parse(fixedJson);
      if (typeof res !== "object" || res === null)
        throw new Error("argsText is expected to be an object");

      res[PARTIAL_JSON_OBJECT_META_SYMBOL] = {
        state: "partial",
        partialPath,
      };
      return res;
    } catch {
      return undefined;
    }
  }
};

const getFieldState = (
  args: unknown,
  argsMeta: PartialJsonObjectMeta,
  fieldPath: string[],
): FieldState => {
  if (typeof args !== "object" || args === null) return argsMeta.state;

  if (argsMeta.state === "complete") return "complete";
  if (fieldPath.length === 0) return "partial";

  const [field, ...restFields] = fieldPath as [string, ...string[]];

  // ensure the current path exists in args
  if (!Object.prototype.hasOwnProperty.call(args, field)) return "partial";

  // ensure the current path is in the partial path
  const [partialField, ...restPartialPath] = argsMeta.partialPath;
  if (field !== partialField) return "complete";

  const value = (args as Record<string, unknown>)[field];

  const innerState: PartialJsonObjectMeta = {
    state: argsMeta.partialPath.length > 0 ? "partial" : "complete",
    partialPath: restPartialPath,
  };

  return getFieldState(value, innerState, restFields);
};

export const getPartialJsonObjectFieldState = (
  args: Record<string, unknown>,
  fieldPath: (string | number)[],
): FieldState => {
  const meta = getPartialJsonObjectMeta(args);
  if (!meta) throw new Error("unable to determine args state");

  return getFieldState(args, meta, fieldPath.map(String));
};
