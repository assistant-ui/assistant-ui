export type ChangeNode = true | { [key: string]: ChangeNode };

const UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

export function assertSafePathSegment(segment: string): void {
  if (UNSAFE_PATH_SEGMENTS.has(segment)) {
    throw new Error(`Unsafe gorp path segment: ${segment}`);
  }
}

export function markChanged(
  node: ChangeNode,
  path: readonly string[],
): ChangeNode {
  if (node === true || path.length === 0) return true;
  let cursor = node;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    assertSafePathSegment(key);
    const next = cursor[key];
    if (next === true) return node;
    if (next === undefined) cursor[key] = {};
    cursor = cursor[key] as { [k: string]: ChangeNode };
  }
  const leaf = path[path.length - 1]!;
  assertSafePathSegment(leaf);
  cursor[leaf] = true;
  return node;
}

export function mergeChanged(
  target: ChangeNode,
  source: ChangeNode,
): ChangeNode {
  if (target === true || source === true) return true;
  for (const key of Object.keys(source)) {
    assertSafePathSegment(key);
    const sChild = source[key]!;
    const tChild = target[key];
    target[key] =
      tChild === undefined
        ? cloneChangeNode(sChild)
        : mergeChanged(tChild, sChild);
  }
  return target;
}

function cloneChangeNode(source: ChangeNode): ChangeNode {
  if (source === true) return true;
  const clone: { [key: string]: ChangeNode } = {};
  for (const key of Object.keys(source)) {
    assertSafePathSegment(key);
    clone[key] = cloneChangeNode(source[key]!);
  }
  return clone;
}

export function lookupChange(
  node: ChangeNode,
  path: readonly string[],
): ChangeNode | false {
  for (const key of path) {
    if (node === true) return true;
    const next = node[key];
    if (next === undefined) return false;
    node = next;
  }
  return node;
}

export function lookupValue(state: unknown, path: readonly string[]): unknown {
  let node = state;
  for (const key of path) {
    assertSafePathSegment(key);
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

export function diffKeys(newNode: unknown, oldNode: unknown): string[] {
  const newKeys =
    typeof newNode === "object" && newNode !== null ? Object.keys(newNode) : [];
  const oldKeys =
    typeof oldNode === "object" && oldNode !== null ? Object.keys(oldNode) : [];
  if (oldKeys.length === 0) return newKeys;
  const newSet = new Set(newKeys);
  const deletedKeys = oldKeys.filter((k) => !newSet.has(k)).reverse();
  return [...newKeys, ...deletedKeys];
}
