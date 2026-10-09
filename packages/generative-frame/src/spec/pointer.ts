/** Splits a JSON Pointer (RFC 6901) into unescaped tokens. `""` is the whole document. */
export function parsePointer(pointer: string): string[] {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) {
    throw new Error(`Invalid JSON Pointer "${pointer}": must start with "/"`);
  }
  return pointer
    .slice(1)
    .split("/")
    .map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
}

export const escapePointerToken = (token: string | number): string =>
  String(token).replace(/~/g, "~0").replace(/\//g, "~1");

export const joinPointer = (tokens: readonly (string | number)[]): string =>
  tokens.map((token) => `/${escapePointerToken(token)}`).join("");

const isContainer = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const ARRAY_INDEX = /^(0|[1-9]\d*)$/;

/** Reads the value at a pointer, or `undefined` when any step is missing. */
export function getAtPointer(
  doc: unknown,
  pointer: string | string[],
): unknown {
  const tokens = typeof pointer === "string" ? parsePointer(pointer) : pointer;
  let current = doc;
  for (const token of tokens) {
    if (Array.isArray(current)) {
      if (!ARRAY_INDEX.test(token)) return undefined;
      current = current[Number(token)];
    } else if (isContainer(current)) {
      if (!Object.hasOwn(current, token)) return undefined;
      current = current[token];
    } else {
      return undefined;
    }
  }
  return current;
}

export type WriteMode = "add" | "replace" | "remove";

export type WriteOptions = {
  /** Create missing intermediate objects instead of failing. */
  createMissing?: boolean;
};

const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Returns a copy of `doc` with the value at `tokens` added, replaced, or
 * removed. Containers along the path are copied; everything else is shared.
 */
export function writeAtPointer(
  doc: unknown,
  tokens: readonly string[],
  mode: WriteMode,
  value?: unknown,
  options: WriteOptions = {},
): unknown {
  if (tokens.length === 0) {
    if (mode === "remove") throw new Error("Cannot remove the whole document");
    return value;
  }
  const [token, ...rest] = tokens as [string, ...string[]];
  if (FORBIDDEN.has(token)) throw new Error(`Forbidden path token "${token}"`);
  const last = rest.length === 0;

  if (Array.isArray(doc)) {
    const copy = doc.slice();
    if (token === "-") {
      if (!last || mode !== "add") {
        throw new Error('"-" can only be the last token of an add');
      }
      copy.push(value);
      return copy;
    }
    if (!ARRAY_INDEX.test(token)) {
      throw new Error(`"${token}" is not an array index`);
    }
    const index = Number(token);
    if (last) {
      if (mode === "add") {
        if (index > copy.length) {
          throw new Error(`Index ${index} is out of bounds`);
        }
        copy.splice(index, 0, value);
      } else {
        if (index >= copy.length) {
          throw new Error(`Index ${index} is out of bounds`);
        }
        if (mode === "remove") copy.splice(index, 1);
        else copy[index] = value;
      }
      return copy;
    }
    if (index >= copy.length)
      throw new Error(`Index ${index} is out of bounds`);
    copy[index] = writeAtPointer(copy[index], rest, mode, value, options);
    return copy;
  }

  if (!isContainer(doc)) {
    if (options.createMissing && doc === undefined && mode !== "remove") {
      return writeAtPointer({}, tokens, mode, value, options);
    }
    throw new Error(`Path segment "${token}" does not exist`);
  }

  const copy: Record<string, unknown> = { ...doc };
  if (last) {
    if (mode === "remove" || (mode === "replace" && !options.createMissing)) {
      if (!Object.hasOwn(copy, token)) {
        throw new Error(`Path segment "${token}" does not exist`);
      }
    }
    if (mode === "remove") delete copy[token];
    else copy[token] = value;
    return copy;
  }
  if (!Object.hasOwn(copy, token) && !options.createMissing) {
    throw new Error(`Path segment "${token}" does not exist`);
  }
  copy[token] = writeAtPointer(copy[token], rest, mode, value, options);
  return copy;
}
