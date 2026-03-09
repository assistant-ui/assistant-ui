import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { isJSONValue, isRecord } from "./is-json";

const MAX_JSON_DEPTH = 100;

const isJSONValueEqualAtDepth = (
  a: ReadonlyJSONValue,
  b: ReadonlyJSONValue,
  currentDepth: number,
): boolean => {
  if (a === b) return true;
  if (currentDepth > MAX_JSON_DEPTH) return false;

  if (a == null || b == null) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) =>
      isJSONValueEqualAtDepth(
        item,
        b[index] as ReadonlyJSONValue,
        currentDepth + 1,
      ),
    );
  }

  if (Array.isArray(b)) return false;
  if (!isRecord(a) || !isRecord(b)) return false;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(
    (key) =>
      Object.hasOwn(b, key) &&
      isJSONValueEqualAtDepth(
        a[key] as ReadonlyJSONValue,
        b[key] as ReadonlyJSONValue,
        currentDepth + 1,
      ),
  );
};

export const isJSONValueEqual = (a: unknown, b: unknown): boolean => {
  if (!isJSONValue(a) || !isJSONValue(b)) return false;
  return isJSONValueEqualAtDepth(a, b, 0);
};
