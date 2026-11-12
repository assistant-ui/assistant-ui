/**
 * The serving layer: turns whatever HTML a model or a developer wrote into
 * a remote component. A page without a doctype, a fragment without
 * `<html>`, and a built SPA are all valid input. Output:
 *
 *   - a doctype (no doctype means quirks mode, where an auto-height
 *     `<html>` fills the viewport and loops in an auto-height frame);
 *   - the runtime tag, first in `<head>` (unless the page has one);
 *   - a Content-Security-Policy for the network policy (as a header, or as
 *     a `<meta>` when the document is shown without headers: srcdoc, SCF).
 *
 * No DOM and no Node APIs here; `@assistant-ui/remote-components-serve/node` has a
 * middleware.
 */

/**
 * Where the page may connect (fetch, XHR, WebSocket, EventSource).
 *
 *   "public" (default): any https/wss endpoint, credential-less (the
 *     remote's own origin has no host cookies; opaque frames have none).
 *     CSP cannot exclude private or loopback addresses; see SPEC §12.
 *   "none": no network at all (`connect-src 'none'`).
 *   a list: exactly these origins (`https://api.example.com`, `https://*.example.com`).
 *
 * A page narrows its own policy with a native CSP of its own,
 * `<meta http-equiv="Content-Security-Policy" content="connect-src …">`:
 * the browser enforces both, so it can never widen this one.
 */
export type NetworkPolicy = "public" | "none" | readonly string[];

export interface NormalizeOptions {
  /** How the runtime gets into the page. Default `{ src: "/rc-runtime.js" }`. */
  runtime?: { src: string } | { inline: string };
  network?: NetworkPolicy;
  /**
   * Host pages that may embed the page: CSP `frame-ancestors` (header only;
   * browsers ignore it in `<meta>`). Default: any. `[]` means none.
   */
  frameAncestors?: readonly string[];
  /** Also put the CSP in a `<meta>` tag (for documents shown without response headers). */
  cspMeta?: boolean;
}

export interface Normalized {
  html: string;
  /** Response headers to send with it. */
  headers: Record<string, string>;
}

const PUBLIC = "https: wss:";
const ORIGIN = /^(https?|wss?):\/\/(\*\.)?[a-z0-9.-]+(:\d{1,5})?$/i;

/** The `connect-src` value for a policy. */
export function connectSrc(policy: NetworkPolicy = "public"): string {
  if (policy === "none") return "'none'";
  const list =
    policy === "public" ? [PUBLIC] : policy.filter((p) => ORIGIN.test(p));
  return list.length === 0 ? "'none'" : list.join(" ");
}

/** The `frame-ancestors` directive for a list of host origins (`[]`: no page may embed it). */
export function frameAncestorsDirective(origins: readonly string[]): string {
  return `frame-ancestors ${origins.join(" ") || "'none'"}`;
}

/** Index after the leading whitespace and comments (a BOM counts as whitespace). */
function prologueEnd(html: string): number {
  let i = 0;
  for (;;) {
    while (i < html.length && /\s/.test(html[i]!)) i++;
    if (!html.startsWith("<!--", i)) return i;
    const end = html.indexOf("-->", i + 4);
    if (end === -1) return i;
    i = end + 3;
  }
}

/** True when the document starts (after comments and whitespace) with a doctype. */
export function hasDoctype(html: string): boolean {
  const i = prologueEnd(html);
  return html.slice(i, i + 9).toLowerCase() === "<!doctype";
}

/** True when the page already loads the runtime itself. */
export function hasRuntime(html: string): boolean {
  return html.includes("data-rc-runtime") || scriptLoadsRuntime(html);
}

// Scans each run of text between `>`s once, from its first `<script`, so
// unclosed tags cost linear time.
function scriptLoadsRuntime(html: string): boolean {
  const open = /<script/gi;
  let from = 0;
  for (;;) {
    open.lastIndex = from;
    const tag = open.exec(html);
    if (tag === null) return false;
    const close = html.indexOf(">", tag.index);
    const end = close === -1 ? html.length : close;
    const attrs = html.slice(tag.index + 8, end);
    for (const m of attrs.matchAll(/src\s*=\s*["']?([^"'\s>]*)/gi)) {
      if (/rc-runtime(\.full)?\.js/i.test(m[1]!)) return true;
    }
    if (close === -1) return false;
    from = close + 1;
  }
}

export function runtimeTag(
  runtime: NormalizeOptions["runtime"] = { src: "/rc-runtime.js" },
): string {
  if ("inline" in runtime)
    return `<script data-rc-runtime>${runtime.inline.replace(/<\/(script)/gi, "<\\/$1")}</script>`;
  return `<script src="${attr(runtime.src)}"></script>`;
}

function attr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** End of the first `<name>` or `<name …>` open tag, or -1. */
function openTagEnd(html: string, name: string): number {
  const open = new RegExp(`<${name}`, "gi");
  for (let m = open.exec(html); m !== null; m = open.exec(html)) {
    const next = m.index + name.length + 1;
    const c = html[next];
    if (c === ">") return next + 1;
    if (c !== undefined && /\s/.test(c)) {
      const close = html.indexOf(">", next);
      return close === -1 ? -1 : close + 1;
    }
  }
  return -1;
}

/** Inserts `tag` as the first thing in `<head>` (creating the context the parser would). */
export function injectHead(html: string, tag: string): string {
  const head = openTagEnd(html, "head");
  if (head !== -1) return html.slice(0, head) + tag + html.slice(head);
  const root = openTagEnd(html, "html");
  if (root !== -1)
    return html.slice(0, root) + `<head>${tag}</head>` + html.slice(root);
  // A fragment: after the doctype, a leading script lands in the implied <head>.
  const dt = hasDoctype(html) ? html.indexOf(">", prologueEnd(html) + 9) : -1;
  return dt === -1
    ? tag + html
    : html.slice(0, dt + 1) + tag + html.slice(dt + 1);
}

/** Normalizes any HTML into a remote component document (see the module comment). */
export function normalizeHtml(
  input: string,
  options: NormalizeOptions = {},
): Normalized {
  let html = hasDoctype(input) ? input : `<!doctype html>\n${input}`;
  const csp = `connect-src ${connectSrc(options.network)}`;
  let head = "";
  if (options.cspMeta)
    head += `<meta http-equiv="Content-Security-Policy" content="${attr(csp)}">`;
  if (!hasRuntime(input)) head += runtimeTag(options.runtime);
  if (head !== "") html = injectHead(html, head);
  const policy = [
    csp,
    ...(options.frameAncestors
      ? [frameAncestorsDirective(options.frameAncestors)]
      : []),
  ].join("; ");
  return {
    html,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": policy,
      // Lets a host tighten the policy with <iframe csp="…"> (CSP Embedded Enforcement).
      "allow-csp-from": "*",
      "x-content-type-options": "nosniff",
    },
  };
}

/**
 * For streaming: what to send before the first byte of the page, so the
 * runtime connects before the body arrives. The page is revealed like any
 * other (after `load`, or DOMContentLoaded + 1.5s). A doctype in the page
 * after this prefix is ignored by the parser.
 */
export function streamPrefix(
  options: Pick<NormalizeOptions, "runtime"> = {},
): string {
  return `<!doctype html>\n${runtimeTag(options.runtime)}`;
}
