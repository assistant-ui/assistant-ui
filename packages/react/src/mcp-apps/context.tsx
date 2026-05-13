"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  MCPAppBridgeHandlers,
  MCPAppHostContext,
  MCPAppHostInfo,
  MCPAppResource,
  MCPAppSandboxConfig,
} from "./types";
import type { MCPAppMetadata } from "@assistant-ui/core";

export type MCPAppContextValue = {
  loadResource?: ((app: MCPAppMetadata) => Promise<MCPAppResource>) | undefined;
  sandbox?: MCPAppSandboxConfig | undefined;
  handlers?: MCPAppBridgeHandlers | undefined;
  hostInfo?: MCPAppHostInfo | undefined;
  hostContext?: MCPAppHostContext | undefined;
  fallback?: ReactNode | undefined;
  loadingFallback?: ReactNode | undefined;
  errorFallback?: ReactNode | ((error: Error) => ReactNode) | undefined;
};

const MCPAppContext = createContext<MCPAppContextValue | null>(null);

export type MCPAppProviderProps = MCPAppContextValue & {
  children: ReactNode;
};

export function MCPAppProvider({
  children,
  loadResource,
  sandbox,
  handlers,
  hostInfo,
  hostContext,
  fallback,
  loadingFallback,
  errorFallback,
}: MCPAppProviderProps) {
  const value = useMemo<MCPAppContextValue>(
    () => ({
      loadResource,
      sandbox,
      handlers,
      hostInfo,
      hostContext,
      fallback,
      loadingFallback,
      errorFallback,
    }),
    [
      loadResource,
      sandbox,
      handlers,
      hostInfo,
      hostContext,
      fallback,
      loadingFallback,
      errorFallback,
    ],
  );
  return (
    <MCPAppContext.Provider value={value}>{children}</MCPAppContext.Provider>
  );
}

export function useMCPAppContext(): MCPAppContextValue {
  return useContext(MCPAppContext) ?? {};
}
