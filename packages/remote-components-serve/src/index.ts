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

/** True when the document starts (after comments and whitespace) with a doctype. */
export function hasDoctype(html: string): boolean {
  return /^﻿?\s*(<!--[\s\S]*?-->\s*)*<!doctype/i.test(html);
}

/** True when the page already loads the runtime itself. */
export function hasRuntime(html: string): boolean {
  return (
    /<script[^>]+src\s*=\s*["']?[^"'\s>]*rc-runtime(\.full)?\.js/i.test(html) ||
    html.includes("data-rc-runtime")
  );
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

/** Inserts `tag` as the first thing in `<head>` (creating the context the parser would). */
export function injectHead(html: string, tag: string): string {
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (head !== null)
    return (
      html.slice(0, head.index + head[0].length) +
      tag +
      html.slice(head.index + head[0].length)
    );
  const root = /<html(\s[^>]*)?>/i.exec(html);
  if (root !== null)
    return (
      html.slice(0, root.index + root[0].length) +
      `<head>${tag}</head>` +
      html.slice(root.index + root[0].length)
    );
  // A fragment: after the doctype, a leading script lands in the implied <head>.
  const dt = /^﻿?\s*(<!--[\s\S]*?-->\s*)*<!doctype[^>]*>/i.exec(html);
  return dt === null
    ? tag + html
    : html.slice(0, dt[0].length) + tag + html.slice(dt[0].length);
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
