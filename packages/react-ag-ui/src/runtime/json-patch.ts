// Minimal RFC 6902 (JSON Patch) implementation scoped to the ops AG-UI agents
// emit via STATE_DELTA. Not a general-purpose patch library: it validates the
// ops it supports and throws on anything outside that subset.
type JsonPatchOp = {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
};

function parsePath(path: string): string[] {
  if (path === "") return [];
  if (!path.startsWith("/")) throw new Error(`Invalid JSON Pointer: ${path}`);
  return path
    .slice(1)
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function requireFrom(patch: JsonPatchOp): string {
  if (typeof patch.from !== "string") {
    throw new Error(`'${patch.op}' op requires a 'from' string pointer`);
  }
  return patch.from;
}

function getParentAndKey(
  doc: any,
  segments: string[],
): { parent: any; key: string } {
  let current = doc;
  for (let i = 0; i < segments.length - 1; i++) {
    current = current[segments[i]!];
    if (current === undefined || current === null) {
      throw new Error(`Path not found: ${segments.slice(0, i + 1).join("/")}`);
    }
  }
  return { parent: current, key: segments[segments.length - 1]! };
}

function requireExists(parent: any, key: string, path: string): void {
  if (Array.isArray(parent)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
      throw new Error(`Path not found: ${path}`);
    }
  } else if (
    parent === null ||
    typeof parent !== "object" ||
    !(key in parent)
  ) {
    throw new Error(`Path not found: ${path}`);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (k) =>
      k in (b as object) &&
      deepEqual((a as any)[k], (b as Record<string, unknown>)[k]),
  );
}

function getValue(doc: any, segments: string[]): unknown {
  let current = doc;
  for (let i = 0; i < segments.length; i++) {
    if (current === undefined || current === null) {
      throw new Error(`Path not found: ${segments.slice(0, i + 1).join("/")}`);
    }
    current = current[segments[i]!];
  }
  return current;
}

function addAt(parent: any, key: string, value: unknown): void {
  if (Array.isArray(parent)) {
    if (key === "-") {
      parent.push(value);
      return;
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index > parent.length) {
      throw new Error(`Invalid array index: ${key}`);
    }
    parent.splice(index, 0, value);
  } else {
    parent[key] = value;
  }
}

export function applyJsonPatch(
  doc: unknown,
  patches: readonly JsonPatchOp[],
): unknown {
  if (patches.length === 0) return doc;
  let result = structuredClone(doc);

  for (const patch of patches) {
    const segments = parsePath(patch.path);

    switch (patch.op) {
      case "add": {
        if (segments.length === 0) {
          result = patch.value;
        } else {
          const { parent, key } = getParentAndKey(result, segments);
          addAt(parent, key, patch.value);
        }
        break;
      }
      case "remove": {
        if (segments.length === 0) {
          result = undefined;
        } else {
          const { parent, key } = getParentAndKey(result, segments);
          requireExists(parent, key, patch.path);
          if (Array.isArray(parent)) {
            parent.splice(Number(key), 1);
          } else {
            delete parent[key];
          }
        }
        break;
      }
      case "replace": {
        if (segments.length === 0) {
          result = patch.value;
        } else {
          const { parent, key } = getParentAndKey(result, segments);
          requireExists(parent, key, patch.path);
          parent[key] = patch.value;
        }
        break;
      }
      case "move": {
        const from = requireFrom(patch);
        const fromSegments = parsePath(from);
        const { parent: fromParent, key: fromKey } = getParentAndKey(
          result,
          fromSegments,
        );
        requireExists(fromParent, fromKey, from);
        const value = fromParent[fromKey];
        if (Array.isArray(fromParent)) {
          fromParent.splice(Number(fromKey), 1);
        } else {
          delete fromParent[fromKey];
        }
        if (segments.length === 0) {
          result = value;
        } else {
          const { parent, key } = getParentAndKey(result, segments);
          addAt(parent, key, value);
        }
        break;
      }
      case "copy": {
        const from = requireFrom(patch);
        const fromSegments = parsePath(from);
        if (fromSegments.length > 0) {
          const { parent, key } = getParentAndKey(result, fromSegments);
          requireExists(parent, key, from);
        }
        const value = structuredClone(getValue(result, fromSegments));
        if (segments.length === 0) {
          result = value;
        } else {
          const { parent, key } = getParentAndKey(result, segments);
          addAt(parent, key, value);
        }
        break;
      }
      case "test": {
        const actual = getValue(result, segments);
        if (!deepEqual(actual, patch.value)) {
          throw new Error(
            `Test failed: ${patch.path} expected ${JSON.stringify(patch.value)} but got ${JSON.stringify(actual)}`,
          );
        }
        break;
      }
      default:
        throw new Error(`Unknown JSON Patch op: ${(patch as JsonPatchOp).op}`);
    }
  }

  return result;
}
