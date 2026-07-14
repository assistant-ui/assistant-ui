import type { ReadonlyJSONObject } from "assistant-stream/utils";

const hasOwn = (value: object, key: string) => Object.hasOwn(value, key);

const stabilizeToolArgsValue = (
  value: unknown,
  path: string,
  keyOrderByPath: Map<string, string[]>,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, idx) =>
      stabilizeToolArgsValue(item, `${path}[${idx}]`, keyOrderByPath),
    );
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const currentKeys = Object.keys(record);
    const previousOrder = keyOrderByPath.get(path) ?? [];
    const previousOrderSet = new Set(previousOrder);
    const nextOrder = [
      ...previousOrder.filter((key) => hasOwn(record, key)),
      ...currentKeys.filter((key) => !previousOrderSet.has(key)),
    ];
    keyOrderByPath.set(path, nextOrder);

    return Object.fromEntries(
      nextOrder.map((key) => [
        key,
        stabilizeToolArgsValue(record[key], `${path}.${key}`, keyOrderByPath),
      ]),
    );
  }

  return value;
};

const getToolArgsKeyOrder = (
  keyOrderCache: Map<string, Map<string, string[]>> | undefined,
  cacheKey: string,
): Map<string, string[]> => {
  const keyOrderByPath = keyOrderCache?.get(cacheKey) ?? new Map();
  keyOrderCache?.set(cacheKey, keyOrderByPath);
  return keyOrderByPath;
};

export const trackToolArgsKeyOrder = (
  keyOrderCache: Map<string, Map<string, string[]>> | undefined,
  cacheKey: string,
  args: ReadonlyJSONObject,
) => {
  const keyOrderByPath = getToolArgsKeyOrder(keyOrderCache, cacheKey);
  stabilizeToolArgsValue(args, "$", keyOrderByPath);
};

export const stableStringifyToolArgs = (
  keyOrderCache: Map<string, Map<string, string[]>> | undefined,
  cacheKey: string,
  args: ReadonlyJSONObject,
): string => {
  const keyOrderByPath = getToolArgsKeyOrder(keyOrderCache, cacheKey);
  const stableArgs = stabilizeToolArgsValue(
    args,
    "$",
    keyOrderByPath,
  ) as ReadonlyJSONObject;
  return JSON.stringify(stableArgs);
};
