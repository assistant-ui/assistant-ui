import type { FC, PropsWithChildren } from "react";
import { useAui, AuiProvider } from "@assistant-ui/store";
import { MCPManagerResource } from "../resources/MCPManagerResource";
import type { MCPStorageElement } from "../resources/storage/types";
import type { MCPConnector } from "../mcp-scope";

export type MCPProviderProps = PropsWithChildren<{
  connectors?: MCPConnector[] | undefined;
  storage?: MCPStorageElement | undefined;
  /** Default true. When false, addCustomServer rejects and the AddCustomTrigger primitive is data-disabled. */
  canAddCustom?: boolean | undefined;
  /** Where the OAuth server redirects back. Defaults to `${window.location.origin}/mcp/callback`. */
  oauthRedirectUri?: string | undefined;
  /** Connect on mount when usable auth exists. Default true. */
  autoConnect?: boolean | undefined;
}>;

function defaultRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/mcp/callback`;
}

export const MCPProvider: FC<MCPProviderProps> = ({
  connectors,
  storage,
  canAddCustom = true,
  oauthRedirectUri,
  autoConnect = true,
  children,
}) => {
  const aui = useAui({
    mcp: MCPManagerResource({
      connectors: connectors ?? [],
      storage,
      redirectUri: oauthRedirectUri ?? defaultRedirectUri(),
      autoConnect,
      canAddCustom,
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
