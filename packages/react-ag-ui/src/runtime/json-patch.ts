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

function getValue(doc: any, segments: string[]): unknown {
  let current = doc;
  for (const seg of segments) {
    if (current === undefined || current === null) {
      throw new Error(`Path not found`);
    }
    current = current[seg];
  }
  return current;
}

function addAt(parent: any, key: string, value: unknown): void {
  if (Array.isArray(parent)) {
    if (key === "-") parent.push(value);
    else parent.splice(Number(key), 0, value);
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
          parent[key] = patch.value;
        }
        break;
      }
      case "move": {
        const fromSegments = parsePath(requireFrom(patch));
        const { parent: fromParent, key: fromKey } = getParentAndKey(
          result,
          fromSegments,
        );
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
        const fromSegments = parsePath(requireFrom(patch));
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
        if (JSON.stringify(actual) !== JSON.stringify(patch.value)) {
          throw new Error(
            `Test failed: ${patch.path} expected ${JSON.stringify(patch.value)} but got ${JSON.stringify(actual)}`,
          );
        }
        break;
      }
    }
  }

  return result;
}
