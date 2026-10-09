import { DEFAULT_EXTERNAL_SCHEMES, parseExternalUrl } from "../external-url";
import { webviewPort, type VSCodeBridgePort } from "./fetch";
import { callHost } from "./rpc";

export type LinkInterceptorOptions = {
  /** URL schemes to open outside the webview, such as `"https:"`. */
  schemes?: readonly string[];
  onError?: (error: unknown) => void;
  port?: VSCodeBridgePort;
};

/**
 * Opens absolute links and `window.open` URLs through the extension host's
 * `openExternal`, since a webview cannot navigate away or open windows.
 * Returns a function that removes the listeners and restores `window.open`.
 */
export function installLinkInterceptor({
  schemes = DEFAULT_EXTERNAL_SCHEMES,
  onError = (error) => console.error(error),
  port = webviewPort,
}: LinkInterceptorOptions = {}): () => void {
  const openExternal = (url: string) => {
    callHost(port, "openExternal", [url]).catch(onError);
  };

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    if (event.button !== (event.type === "auxclick" ? 1 : 0)) return;
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]");
    const url = parseExternalUrl(anchor?.getAttribute("href"), schemes);
    if (!url) return;
    event.preventDefault();
    openExternal(url);
  };

  let installed = true;
  const originalOpen = window.open;
  const patchedOpen: typeof window.open = function (url, ...rest) {
    const external = installed ? parseExternalUrl(url, schemes) : null;
    if (!external) return originalOpen.call(window, url, ...rest);
    openExternal(external);
    return null;
  };

  document.addEventListener("click", onClick);
  document.addEventListener("auxclick", onClick);
  window.open = patchedOpen;

  return () => {
    installed = false;
    document.removeEventListener("click", onClick);
    document.removeEventListener("auxclick", onClick);
    if (window.open === patchedOpen) window.open = originalOpen;
  };
}
