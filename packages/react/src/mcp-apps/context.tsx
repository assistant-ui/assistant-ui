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
}: MCPAppProviderProps) {
  const value = useMemo<MCPAppContextValue>(
    () => ({ loadResource, sandbox, handlers, hostInfo, hostContext }),
    [loadResource, sandbox, handlers, hostInfo, hostContext],
  );
  return (
    <MCPAppContext.Provider value={value}>{children}</MCPAppContext.Provider>
  );
}

export function useMCPAppContext(): MCPAppContextValue {
  return useContext(MCPAppContext) ?? {};
}
