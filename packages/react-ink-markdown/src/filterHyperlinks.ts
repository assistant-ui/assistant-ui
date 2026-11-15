const HYPERLINK_SCHEMES = new Set(["http:", "https:"]);

const OSC8_START = "\u001b]8;";
const BEL = "\u0007";
const ST = "\u001b\\";
const OSC8_CLOSE = `\u001b]8;;${BEL}`;
const ESC = "\u001b";
const SGR = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

export const hyperlinkTarget = (url: string): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (!HYPERLINK_SCHEMES.has(parsed.protocol)) return undefined;
  const href = parsed.href;
  return /^[\x21-\x7e]+$/.test(href) ? href : undefined;
};

type Token = { text: string } | { url: string };

// Splits output into text and OSC 8 sequences (`ESC ]8;params;url` ended by
// BEL or ST). An opener with no terminator is dropped and what follows it is
// kept as text.
const tokenize = (rendered: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;
  let start = rendered.indexOf(OSC8_START);
  while (start !== -1) {
    const from = start + OSC8_START.length;
    const bel = rendered.indexOf(BEL, from);
    const st = rendered.indexOf(ST, from);
    const end = bel === -1 ? st : st === -1 ? bel : Math.min(bel, st);
    const paramsEnd = rendered.indexOf(";", from);
    tokens.push({ text: rendered.slice(index, start) });
    if (end === -1 || paramsEnd === -1 || paramsEnd > end) {
      index =
        paramsEnd !== -1 && (end === -1 || paramsEnd < end)
          ? paramsEnd + 1
          : from;
    } else {
      tokens.push({ url: rendered.slice(paramsEnd + 1, end) });
      index = end + (end === bel ? BEL.length : ST.length);
    }
    start = rendered.indexOf(OSC8_START, index);
  }
  tokens.push({ text: rendered.slice(index) });
  return tokens;
};

const compact = (text: string) => text.replace(SGR, "").replace(/\s+/g, "");

// Between the segments of a wrapped link there is only a line break,
// indentation or a quote prefix.
const isWrapGap = (text: string) =>
  text.includes("\n") && !/[\p{L}\p{N}]/u.test(text.replace(SGR, ""));

// markdansi has no per-link hook, so this rewrites the OSC 8 sequences it
// emitted. A refused link keeps its label followed by a dim " (url)", the way
// markdansi renders links with hyperlinks off. markdansi only emits OSC 8
// when color is on, so the dim SGR is always allowed here.
export const filterHyperlinks = (rendered: string): string => {
  if (!rendered.includes(OSC8_START)) return rendered;
  let result = "";
  let kept = false;
  let refused:
    | { url: string; label: string; closedAt: number | undefined; gap: string }
    | undefined;

  const finishRefused = () => {
    if (!refused) return;
    const at = refused.closedAt ?? result.length;
    if (compact(refused.label) !== compact(refused.url)) {
      const suffix = `\u001b[2m (${refused.url})\u001b[22m`;
      result = result.slice(0, at) + suffix + result.slice(at);
    }
    refused = undefined;
  };

  for (const token of tokenize(rendered)) {
    if ("text" in token) {
      result += token.text;
      if (refused?.closedAt === undefined) {
        if (refused) refused.label += token.text;
      } else {
        refused.gap += token.text;
      }
      continue;
    }

    const { url } = token;
    if (url === "") {
      if (refused && refused.closedAt === undefined) {
        refused.closedAt = result.length;
        refused.gap = "";
      } else if (kept) {
        result += OSC8_CLOSE;
        kept = false;
      }
      continue;
    }

    if (refused?.url === url) {
      if (refused.closedAt === undefined) continue;
      if (isWrapGap(refused.gap)) {
        refused.closedAt = undefined;
        continue;
      }
    }
    finishRefused();

    const target = hyperlinkTarget(url);
    if (target === undefined) {
      if (kept) result += OSC8_CLOSE;
      kept = false;
      refused = { url, label: "", closedAt: undefined, gap: "" };
    } else {
      result += `\u001b]8;;${target}${BEL}`;
      kept = true;
    }
  }

  finishRefused();
  if (kept) result += OSC8_CLOSE;
  return result;
};
