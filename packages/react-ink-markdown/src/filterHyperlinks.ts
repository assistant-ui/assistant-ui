const HYPERLINK_SCHEMES = new Set(["http:", "https:"]);

const OSC8_START = "\u001b]8;";
const BEL = "\u0007";
const ST = "\u001b\\";
const OSC8_CLOSE = `\u001b]8;;${BEL}`;

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

export const hasRefusedHyperlink = (rendered: string): boolean =>
  rendered.includes(OSC8_START) &&
  tokenize(rendered).some(
    (token) =>
      "url" in token && token.url !== "" && !hyperlinkTarget(token.url),
  );

// Keeps hyperlinks whose target passes hyperlinkTarget, written with the
// normalized URL, and drops every other sequence. Every kept link is closed.
export const filterHyperlinks = (rendered: string): string => {
  if (!rendered.includes(OSC8_START)) return rendered;
  let result = "";
  let open = false;
  for (const token of tokenize(rendered)) {
    if ("text" in token) {
      result += token.text;
      continue;
    }
    const target = token.url === "" ? undefined : hyperlinkTarget(token.url);
    if (open) result += OSC8_CLOSE;
    open = target !== undefined;
    if (target !== undefined) result += `\u001b]8;;${target}${BEL}`;
  }
  if (open) result += OSC8_CLOSE;
  return result;
};
