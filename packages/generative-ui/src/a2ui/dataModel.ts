import { equalData, isRecord } from "../equalData";
import { decodeScopeRelativePointer } from "./pointer";
import { setAtPointer } from "./reducer";

export { equalData } from "../equalData";

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
