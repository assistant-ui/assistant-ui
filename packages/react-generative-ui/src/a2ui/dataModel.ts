import { decodeScopeRelativePointer } from "./pointer";
import { setAtPointer } from "./reducer";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const equalData = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => equalData(value, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && equalData(left[key], right[key]),
    )
  );
};

export const resolvePath = (
  source: unknown,
  segments: readonly string[],
): unknown => {
  let current = source;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return undefined;
      current = current[Number(segment)];
      continue;
    }
    if (!isRecord(current) || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

export const resolvePointer = (source: unknown, path: string): unknown =>
  resolvePath(source, decodeScopeRelativePointer(path));

export const reconcileDataModel = (
  previous: unknown,
  incoming: unknown,
  local: unknown,
  editedPaths: ReadonlySet<string>,
) => {
  let value = incoming;
  const retained = new Set<string>();
  for (const path of editedPaths) {
    if (
      equalData(resolvePointer(previous, path), resolvePointer(incoming, path))
    ) {
      value = setAtPointer(
        value,
        path,
        resolvePointer(local, path),
        false,
      ).value;
      retained.add(path);
    }
  }
  return { incoming, value, editedPaths: retained };
};
