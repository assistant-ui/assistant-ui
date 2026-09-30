/**
 * Returns the nonce `renderWebviewHtml` wrote to `<meta property="csp-nonce">`,
 * for libraries that inject `<style>` or `<script>` tags at runtime.
 */
export function getCspNonce(): string | undefined {
  const meta = globalThis.document?.querySelector<HTMLMetaElement>(
    'meta[property="csp-nonce"]',
  );
  return meta?.nonce || meta?.getAttribute("nonce") || undefined;
}
