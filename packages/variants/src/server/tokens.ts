export type Token =
  | {
      kind: "open";
      name: string;
      id: string | undefined;
      start: number;
      /** Offset just after the opening tag's `>`. */
      end: number;
      selfClosing: boolean;
    }
  | { kind: "close"; name: string; start: number; end: number }
  | { kind: "comment"; start: number; end: number };

const NAME = /[A-Za-z_$][\w$.:-]*/y;
const JSX_START = /<(?:>|[A-Za-z_$][\w$.:-]*(?=[\s/><])(?!\s+extends\s|\s*=))/y;
const ID_VALUE =
  /\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)\s*\})/y;
const KEYWORDS = new Set([
  "return",
  "yield",
  "await",
  "case",
  "typeof",
  "in",
  "of",
  "else",
  "do",
  "void",
  "delete",
]);
const FENCE = /^[ \t]*(`{3,}|~{3,})/;

/**
 * Splits JSX, JS or MDX source into JSX tags and JS block comments, skipping
 * strings, template literals, regular expressions, line comments, JSX text and
 * (in MDX) code fences and inline code, so text that only looks like a tag or
 * a comment is never reported.
 */
export const tokenize = (source: string, mdx = false): Token[] => {
  const tokens: Token[] = [];
  const length = source.length;
  let i = 0;

  const startsExpression = (at: number) => {
    let cursor = at - 1;
    while (cursor >= 0 && /\s/.test(source[cursor]!)) cursor--;
    if (cursor < 0) return true;
    const char = source[cursor]!;
    if (/[\w$]/.test(char)) {
      let begin = cursor;
      while (begin > 0 && /[\w$]/.test(source[begin - 1]!)) begin--;
      return KEYWORDS.has(source.slice(begin, cursor + 1));
    }
    return "([{,;=:?!&|+-*%~^<>".includes(char);
  };

  const skipQuoted = () => {
    const quote = source[i];
    i++;
    while (i < length && source[i] !== quote && source[i] !== "\n") {
      if (source[i] === "\\") i++;
      i++;
    }
    i++;
  };

  const skipRegex = () => {
    let inClass = false;
    i++;
    while (i < length && source[i] !== "\n") {
      const char = source[i];
      if (char === "\\") i++;
      else if (char === "[") inClass = true;
      else if (char === "]") inClass = false;
      else if (char === "/" && !inClass) break;
      i++;
    }
    i++;
  };

  const template = () => {
    i++;
    while (i < length) {
      const char = source[i];
      if (char === "\\") i += 2;
      else if (char === "`") {
        i++;
        return;
      } else if (char === "$" && source[i + 1] === "{") {
        i += 2;
        code(true);
      } else i++;
    }
  };

  const comment = (record: boolean) => {
    const close = source.indexOf("*/", i + 2);
    const end = close === -1 ? length : close + 2;
    if (record) tokens.push({ kind: "comment", start: i, end });
    i = end;
  };

  /**
   * JS until EOF, or until the `}` that closes an expression when `braced`.
   * Only a block comment directly inside a JSX child expression is
   * reported, so an ordinary block comment can never be taken for a marker.
   */
  function code(braced: boolean, child = false) {
    let depth = 0;
    while (i < length) {
      const char = source[i]!;
      const next = source[i + 1];
      if (char === "/" && next === "/") {
        const end = source.indexOf("\n", i);
        i = end === -1 ? length : end;
      } else if (char === "/" && next === "*") comment(child && depth === 0);
      else if (char === '"' || char === "'") skipQuoted();
      else if (char === "`") template();
      else if (char === "/" && startsExpression(i)) skipRegex();
      else if (char === "<" && startsExpression(i) && jsxAt(i)) element(false);
      else {
        if (char === "{") depth++;
        else if (char === "}") {
          if (depth === 0 && braced) {
            i++;
            return;
          }
          depth--;
        }
        i++;
      }
    }
  }

  const jsxAt = (at: number) => {
    JSX_START.lastIndex = at;
    return JSX_START.test(source);
  };

  const readName = () => {
    NAME.lastIndex = i;
    const match = NAME.exec(source);
    if (!match) return "";
    i = NAME.lastIndex;
    return match[0];
  };

  function element(markdown: boolean) {
    const start = i;
    i++;
    const name = readName();
    if (source[i] === "<") {
      for (let depth = 0; i < length; i++) {
        if (source[i] === "<") depth++;
        else if (source[i] === ">" && --depth === 0) {
          i++;
          break;
        }
      }
    }
    let id: string | undefined;
    while (i < length) {
      const char = source[i]!;
      if (char === ">" || (char === "/" && source[i + 1] === ">")) {
        const selfClosing = char === "/";
        i += selfClosing ? 2 : 1;
        tokens.push({ kind: "open", name, id, start, end: i, selfClosing });
        if (!selfClosing) children(name, markdown);
        return;
      }
      if (char === "{") {
        i++;
        code(true);
      } else if (char === "/" && source[i + 1] === "/") i = lineEnd(i);
      else if (char === "/" && source[i + 1] === "*") {
        const close = source.indexOf("*/", i + 2);
        i = close === -1 ? length : close + 2;
      } else if (char === '"' || char === "'") {
        const close = source.indexOf(char, i + 1);
        i = close === -1 ? length : close + 1;
      } else if (/[A-Za-z_$]/.test(char)) {
        const attribute = readName();
        if (attribute === "id" && id === undefined) {
          ID_VALUE.lastIndex = i;
          const found = ID_VALUE.exec(source);
          if (found) {
            id = found.slice(1).find((value) => value !== undefined);
            i = ID_VALUE.lastIndex;
          }
        }
      } else i++;
    }
  }

  /** JSX children (or MDX text when `name` is undefined) until the closing tag. */
  const lineEnd = (at: number) => {
    const end = source.indexOf("\n", at);
    return end === -1 ? length : end;
  };

  const skipFence = (marker: string) => {
    let cursor = lineEnd(i);
    while (cursor < length) {
      const end = lineEnd(cursor + 1);
      if (
        source
          .slice(cursor + 1, end)
          .trim()
          .startsWith(marker)
      ) {
        i = end;
        return;
      }
      cursor = end;
    }
    i = length;
  };

  function children(name: string | undefined, markdown: boolean) {
    let lineStart = true;
    while (i < length) {
      const char = source[i]!;
      if (markdown && lineStart) {
        const fence = FENCE.exec(source.slice(i, lineEnd(i)));
        if (fence) {
          skipFence(fence[1]!);
          continue;
        }
      }
      lineStart = char === "\n";
      if (char === "{") {
        i++;
        code(true, true);
      } else if (char === "<" && source[i + 1] === "/") {
        const start = i;
        i += 2;
        const closing = readName();
        const close = source.indexOf(">", i);
        i = close === -1 ? length : close + 1;
        tokens.push({ kind: "close", name: closing, start, end: i });
        if (name !== undefined) return;
      } else if (char === "<" && jsxAt(i)) element(markdown);
      else if (markdown && char === "`") {
        let run = 1;
        while (source[i + run] === "`") run++;
        const delimiter = "`".repeat(run);
        let close = source.indexOf(delimiter, i + run);
        while (close !== -1 && source[close + run] === "`")
          close = source.indexOf(delimiter, close + run + 1);
        i = close === -1 ? i + run : close + run;
      } else i++;
    }
  }

  if (mdx) children(undefined, true);
  else code(false);
  return tokens;
};
