import {
  connectSrc,
  hasRuntime,
  injectHead,
  normalizeHtml,
  runtimeTag,
  type NetworkPolicy,
} from "@assistant-ui/remote-components-serve";

export type { NetworkPolicy };

/**
 * Prepares a document the host shows itself (the `html` prop, or SCF): the
 * serving layer's normalization with the runtime inlined and the CSP as a
 * `<meta>` (there are no response headers). `base`: the URL relative
 * references resolve against (a page fetched from a widget server and shown
 * from a blob URL).
 */
export async function prepareDocument(
  html: string,
  options: { network?: NetworkPolicy; base?: string } = {},
): Promise<string> {
  const { RUNTIME_SOURCE } =
    await import("@assistant-ui/remote-components-runtime/source");
  let doc = normalizeHtml(html, {
    runtime: { inline: RUNTIME_SOURCE },
    ...(options.network !== undefined ? { network: options.network } : {}),
    cspMeta: true,
  }).html;
  // A page that loads the runtime by URL gets the inlined copy too, first:
  // the URL may not load from here (mixed content from an https SCF
  // origin, a CSP). The runtime starts once; the later tag is a no-op.
  if (hasRuntime(html))
    doc = injectHead(doc, runtimeTag({ inline: RUNTIME_SOURCE }));
  if (options.base !== undefined)
    doc = injectHead(
      doc,
      `<base href="${options.base.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">`,
    );
  return doc;
}

/** The `csp` attribute for a URL remote under `network` (CSP Embedded Enforcement), or undefined for the default. */
export function frameCsp(
  network: NetworkPolicy | undefined,
): string | undefined {
  return network === undefined || network === "public"
    ? undefined
    : `connect-src ${connectSrc(network)}`;
}
