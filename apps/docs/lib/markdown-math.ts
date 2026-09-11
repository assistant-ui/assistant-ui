import {
  escapeCurrencyDollars,
  normalizeMathDelimiters,
} from "@assistant-ui/react-markdown";

const CODE_FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const CODE_FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t\r]*$/;
const MATH_FENCE = /^ {0,3}\$\$[ \t\r]*$/;
const MATH_FENCE_WITH_CONTENT = /^ {0,3}\$\$(?!\$)[ \t]*(\S.*?)[ \t\r]*$/;
const MATH_ONE_LINE = /^ {0,3}\$\$(?!\$)[ \t]*(\S.*?\S|\S)[ \t]*\$\$[ \t\r]*$/;
const TRAILING_MATH_FENCE = /\S[ \t]*\$\$[ \t\r]*$/;

const indentOf = (line: string) => /^[ \t]*/.exec(line)![0];

const closesFence = (line: string, fence: string) => {
  const close = CODE_FENCE_CLOSE.exec(line)?.[1];
  return (
    close !== undefined && close[0] === fence[0] && close.length >= fence.length
  );
};

// remark-math treats text after an opening `$$` as meta and only closes a
// display block when the closing fence sits on its own line; models often
// start the first equation line with `$$` and end the last one with `$$`,
// which drops the first line and turns the rest of the reply into one
// unterminated formula. A `$$…$$` line standing alone is inline math to
// remark-math, so it renders left aligned while fenced blocks center; it
// becomes a fenced block so every display equation sits the same way.
export function closeDisplayMathFences(text: string): string {
  const out: string[] = [];
  let codeFence: string | undefined;
  let inMath = false;
  let mathIndent = "";

  for (const line of text.split("\n")) {
    if (codeFence !== undefined) {
      if (closesFence(line, codeFence)) codeFence = undefined;
      out.push(line);
      continue;
    }

    if (MATH_FENCE.test(line)) {
      inMath = !inMath;
      if (inMath) mathIndent = indentOf(line);
      out.push(line);
      continue;
    }

    if (inMath) {
      if (!line.startsWith("$$") && TRAILING_MATH_FENCE.test(line)) {
        out.push(line.replace(/[ \t]*\$\$[ \t\r]*$/, ""), `${mathIndent}$$`);
        inMath = false;
      } else {
        out.push(line);
      }
      continue;
    }

    const indent = indentOf(line);
    const oneLine = MATH_ONE_LINE.exec(line)?.[1];
    if (oneLine !== undefined && !oneLine.includes("$$")) {
      out.push(`${indent}$$`, `${indent}${oneLine}`, `${indent}$$`);
      continue;
    }

    const opener = MATH_FENCE_WITH_CONTENT.exec(line)?.[1];
    if (opener !== undefined && !opener.includes("$$")) {
      out.push(`${indent}$$`, `${indent}${opener}`);
      inMath = true;
      mathIndent = indent;
      continue;
    }

    codeFence = CODE_FENCE_OPEN.exec(line)?.[1];
    out.push(line);
  }

  return out.join("\n");
}

const backtickRun = (text: string, start: number) => {
  let length = 0;
  while (text[start + length] === "`") length++;
  return length;
};

const isEscaped = (text: string, index: number) => {
  let backslashes = 0;
  while (
    index - backslashes - 1 >= 0 &&
    text[index - backslashes - 1] === "\\"
  ) {
    backslashes++;
  }
  return backslashes % 2 === 1;
};

// Backslashes do not escape inside a code span, so the closing run is taken
// as written.
const closingBacktickRun = (text: string, from: number, length: number) => {
  let index = from;
  while (index < text.length) {
    if (text[index] !== "`") {
      index++;
      continue;
    }
    const run = backtickRun(text, index);
    if (run === length) return index;
    index += run;
  }
  return -1;
};

const mapOutsideCodeSpans = (
  text: string,
  transform: (prose: string) => string,
) => {
  let out = "";
  let proseStart = 0;
  let index = 0;

  while (index < text.length) {
    if (text[index] !== "`" || isEscaped(text, index)) {
      index++;
      continue;
    }
    const run = backtickRun(text, index);
    const close = closingBacktickRun(text, index + run, run);
    if (close === -1) {
      index += run;
      continue;
    }
    out +=
      transform(text.slice(proseStart, index)) + text.slice(index, close + run);
    proseStart = close + run;
    index = proseStart;
  }

  return out + transform(text.slice(proseStart));
};

// Fenced blocks and code spans pass through untouched; only prose reaches
// the transform, so a LaTeX-looking regex in a code sample stays code.
export function mapProse(
  text: string,
  transform: (prose: string) => string,
): string {
  const out: string[] = [];
  let prose: string[] = [];
  let codeFence: string | undefined;

  const flush = () => {
    if (prose.length === 0) return;
    out.push(mapOutsideCodeSpans(prose.join("\n"), transform));
    prose = [];
  };

  for (const line of text.split("\n")) {
    if (codeFence !== undefined) {
      if (closesFence(line, codeFence)) codeFence = undefined;
      out.push(line);
      continue;
    }

    const open = CODE_FENCE_OPEN.exec(line)?.[1];
    if (open !== undefined) {
      flush();
      codeFence = open;
      out.push(line);
      continue;
    }

    prose.push(line);
  }

  flush();
  return out.join("\n");
}

const SHELL_VARIABLE_NAME = /^(?:[A-Z][A-Z0-9]+_[A-Z0-9_]+|[A-Z]{4,})/;

// A dollar opens a shell variable when a shell style name follows and no later
// dollar on the line could close a math span; a later dollar that opens another
// shell variable does not count. Single dollar math is on, and
// escapeCurrencyDollars only guards a dollar followed by a digit.
const opensShellVariable = (text: string, index: number) => {
  if (text[index + 1] === "$" || text[index - 1] === "$") return false;
  if (isEscaped(text, index)) return false;
  const name = SHELL_VARIABLE_NAME.exec(text.slice(index + 1))?.[0];
  if (name === undefined) return false;
  const after = index + 1 + name.length;
  if (text[after] === "$") return false;
  const lineEnd = text.indexOf("\n", after);
  const end = lineEnd === -1 ? text.length : lineEnd;
  for (let cursor = after; cursor < end; cursor++) {
    if (text[cursor] !== "$" || isEscaped(text, cursor)) continue;
    if (text[cursor + 1] === "$") {
      cursor++;
      continue;
    }
    return SHELL_VARIABLE_NAME.test(text.slice(cursor + 1));
  }
  return true;
};

export const escapeShellVariables = (text: string) => {
  let out = "";
  let last = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== "$" || !opensShellVariable(text, index)) continue;
    out += text.slice(last, index) + "\\$";
    last = index + 1;
  }
  return out + text.slice(last);
};

// The bracket rewrite in normalizeMathDelimiters emits `$$body$$` even when
// the body spans lines, which is the fence shape repaired above, so the repair
// runs after it.
export const preprocessMath = (text: string) =>
  mapProse(text, (prose) =>
    escapeShellVariables(
      escapeCurrencyDollars(
        closeDisplayMathFences(normalizeMathDelimiters(prose)),
      ),
    ),
  );
