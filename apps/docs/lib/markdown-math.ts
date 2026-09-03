import {
  escapeCurrencyDollars,
  normalizeMathDelimiters,
} from "@assistant-ui/react-markdown";

const CODE_FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const CODE_FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t\r]*$/;
const MATH_FENCE = /^ {0,3}\$\$[ \t\r]*$/;
const MATH_FENCE_WITH_CONTENT = /^ {0,3}\$\$(?!\$)[ \t]*(\S.*?)[ \t\r]*$/;
const TRAILING_MATH_FENCE = /\S[ \t]*\$\$[ \t\r]*$/;

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
// unterminated formula.
export function closeDisplayMathFences(text: string): string {
  const out: string[] = [];
  let codeFence: string | undefined;
  let inMath = false;

  for (const line of text.split("\n")) {
    if (codeFence !== undefined) {
      if (closesFence(line, codeFence)) codeFence = undefined;
      out.push(line);
      continue;
    }

    if (MATH_FENCE.test(line)) {
      inMath = !inMath;
      out.push(line);
      continue;
    }

    if (inMath) {
      if (!line.startsWith("$$") && TRAILING_MATH_FENCE.test(line)) {
        out.push(line.replace(/[ \t]*\$\$[ \t\r]*$/, ""), "$$");
        inMath = false;
      } else {
        out.push(line);
      }
      continue;
    }

    const opener = MATH_FENCE_WITH_CONTENT.exec(line)?.[1];
    if (opener !== undefined && !opener.includes("$$")) {
      out.push("$$", opener);
      inMath = true;
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
    if (text[index] !== "`") {
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

// The bracket rewrite in normalizeMathDelimiters emits `$$body$$` even when
// the body spans lines, which is the fence shape repaired above, so the repair
// runs after it.
export const preprocessMath = (text: string) =>
  mapProse(text, (prose) =>
    escapeCurrencyDollars(
      closeDisplayMathFences(normalizeMathDelimiters(prose)),
    ),
  );
