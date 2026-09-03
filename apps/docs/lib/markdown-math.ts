import {
  escapeCurrencyDollars,
  normalizeMathDelimiters,
} from "@assistant-ui/react-markdown";

const CODE_FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const CODE_FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t\r]*$/;
const MATH_FENCE = /^ {0,3}\$\$[ \t\r]*$/;
const TRAILING_MATH_FENCE = /\S[ \t]*\$\$[ \t\r]*$/;

// remark-math only closes a display block when the closing fence sits on its
// own line; models often end the last equation line with `$$`, which turns the
// rest of the reply into one unterminated formula.
export function closeDisplayMathFences(text: string): string {
  const out: string[] = [];
  let codeFence: string | undefined;
  let inMath = false;

  for (const line of text.split("\n")) {
    if (codeFence !== undefined) {
      const fence = CODE_FENCE_CLOSE.exec(line)?.[1];
      if (
        fence !== undefined &&
        fence[0] === codeFence[0] &&
        fence.length >= codeFence.length
      ) {
        codeFence = undefined;
      }
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

    codeFence = CODE_FENCE_OPEN.exec(line)?.[1];
    out.push(line);
  }

  return out.join("\n");
}

export const preprocessMath = (text: string) =>
  escapeCurrencyDollars(normalizeMathDelimiters(closeDisplayMathFences(text)));
