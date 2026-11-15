const HYPERLINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);

const OSC8_START = "\u001b]8;;";
const BEL = "\u0007";

/**
 * Returns the URL to put in an OSC 8 hyperlink, or `undefined` when the link
 * should render as plain text: only absolute http, https and mailto URLs are
 * linked, and the serialized form percent-encodes anything outside printable
 * ASCII.
 */
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

/**
 * Rewrites the OSC 8 hyperlinks in rendered terminal output. A link whose
 * target passes {@link hyperlinkTarget} keeps its sequence with the
 * normalized URL; any other link keeps its text and loses the sequence.
 */
export const filterHyperlinks = (rendered: string): string => {
  let start = rendered.indexOf(OSC8_START);
  if (start === -1) return rendered;
  let result = "";
  let index = 0;
  let dropping = false;
  while (start !== -1) {
    const urlStart = start + OSC8_START.length;
    const end = rendered.indexOf(BEL, urlStart);
    if (end === -1) break;
    result += rendered.slice(index, start);
    const url = rendered.slice(urlStart, end);
    if (url === "") {
      if (!dropping) result += OSC8_START + BEL;
      dropping = false;
    } else {
      const target = hyperlinkTarget(url);
      dropping = target === undefined;
      if (target !== undefined) result += OSC8_START + target + BEL;
    }
    index = end + BEL.length;
    start = rendered.indexOf(OSC8_START, index);
  }
  return result + rendered.slice(index);
};
