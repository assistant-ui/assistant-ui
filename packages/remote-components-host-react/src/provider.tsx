import { createContext, useContext, type ReactNode } from "react";
import type { ThemeOptions } from "./theme.js";
import type { NetworkPolicy } from "./document.js";

export interface RemoteHostConfig {
  theme?: ThemeOptions;
  /** ms until a remote must be ready. Default 10000. */
  timeout?: number;
  /** Default iframe sandbox tokens. */
  sandbox?: string;
  /** Default `allow` (permissions policy) attribute. Default "" (nothing delegated). */
  allow?: string;
  /**
   * Origins overlay content may be loaded from. Default "same-origin": the
   * requesting remote's own origin only.
   */
  overlayOrigins?: "same-origin" | "any" | readonly string[];
  /** z-index of the overlay layer. Default 2147483000. */
  overlayZIndex?: number;
  /**
   * Default network policy for every remote (SPEC §12): "public" (any
   * https/wss endpoint, credential-less), "none", or a list of origins.
   */
  network?: NetworkPolicy;
  /** Default isolation for every RemoteComponent ("url" unless set). */
  isolation?: "url" | "scf";
  /** Safe Content Frame settings for `isolation="scf"`. */
  scf?: {
    /** SCF product id (shim path). Default "remote-components". */
    product?: string;
    /** Self-hosted shim domain (`unsafeShimDomain`). Default: SCF's `scf.auiusercontent.com`. */
    shimDomain?: string;
    /**
     * Origin granularity: "publisher" (default) gives every publisher one
     * hashed origin (shared process, cache and storage among its instances);
     * "instance" gives each instance its own (needs `instanceId` to be
     * stable); or a function returning the salt.
     */
    salt?:
      | "publisher"
      | "instance"
      | ((info: {
          src: string;
          remoteOrigin: string;
          instanceId: string | undefined;
        }) => string);
    /**
     * Loads the document for `src`. Default: fetch without credentials
     * `src` + `single.html` when `src` ends in `/` (falling back to `src`),
     * else `src`. The host then adds the runtime, doctype and CSP.
     */
    loadHtml?: (src: string) => Promise<string>;
  };
  /**
   * Allow a remote on the host's own origin with `allow-same-origin`. That
   * combination lets the remote script the host page and remove its own
   * sandbox, so it is refused unless you opt in (e.g. for local tests).
   */
  dangerouslyAllowSameOrigin?: boolean;
}

export const DEFAULT_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

const HostConfigContext = createContext<RemoteHostConfig>({});

/** Configures every `<RemoteComponent>` below it. Optional. */
export function RemoteHostProvider({
  children,
  ...config
}: RemoteHostConfig & { children?: ReactNode }): ReactNode {
  const parent = useContext(HostConfigContext);
  return (
    <HostConfigContext.Provider value={{ ...parent, ...config }}>
      {children}
    </HostConfigContext.Provider>
  );
}

export function useHostConfig(): RemoteHostConfig {
  return useContext(HostConfigContext);
}
