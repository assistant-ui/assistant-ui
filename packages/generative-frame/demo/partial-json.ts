/**
 * Parses the longest usable prefix of a JSON document that is still being
 * streamed: open strings, arrays, and objects are closed where the text
 * ends, an unfinished escape or literal is dropped, and a key without a
 * value is left out. Returns undefined when nothing usable has arrived.
 */
export function parsePartialJson(text: string): unknown {
  let index = 0;

  const skipWhitespace = () => {
    while (index < text.length && /\s/.test(text[index]!)) index++;
  };

  let closed = false;
  const parseString = (): string => {
    index++;
    closed = false;
    let result = "";
    while (index < text.length) {
      const char = text[index]!;
      if (char === '"') {
        index++;
        closed = true;
        return result;
      }
      if (char === "\\") {
        const next = text[index + 1];
        if (next === undefined) {
          index = text.length;
          return result;
        }
        if (next === "u") {
          const hex = text.slice(index + 2, index + 6);
          if (hex.length < 4 || !/^[\da-f]{4}$/i.test(hex)) {
            index = text.length;
            return result;
          }
          result += String.fromCharCode(Number.parseInt(hex, 16));
          index += 6;
          continue;
        }
        const escapes: Record<string, string> = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        result += escapes[next] ?? next;
        index += 2;
        continue;
      }
      result += char;
      index++;
    }
    return result;
  };

  const DONE = Symbol("incomplete");

  const parseValue = (): unknown => {
    skipWhitespace();
    const char = text[index];
    if (char === undefined) return DONE;
    if (char === '"') return parseString();
    if (char === "{") {
      index++;
      const result: Record<string, unknown> = {};
      for (;;) {
        skipWhitespace();
        if (index >= text.length) return result;
        if (text[index] === "}") {
          index++;
          return result;
        }
        if (text[index] === ",") {
          index++;
          continue;
        }
        if (text[index] !== '"') return result;
        const key = parseString();
        if (!closed) return result;
        skipWhitespace();
        if (text[index] !== ":") return result;
        index++;
        const value = parseValue();
        if (value === DONE) return result;
        result[key] = value;
      }
    }
    if (char === "[") {
      index++;
      const result: unknown[] = [];
      for (;;) {
        skipWhitespace();
        if (index >= text.length) return result;
        if (text[index] === "]") {
          index++;
          return result;
        }
        if (text[index] === ",") {
          index++;
          continue;
        }
        const value = parseValue();
        if (value === DONE) return result;
        result.push(value);
      }
    }
    const literal =
      /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
        text.slice(index),
      );
    if (!literal) return DONE;
    index += literal[0].length;
    return JSON.parse(literal[0]);
  };

  const value = parseValue();
  return value === DONE ? undefined : value;
}
