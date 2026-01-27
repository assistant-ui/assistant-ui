"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { MCPBridge, type AppCapabilities } from "./bridge";
import type {
  HostContext,
  ToolResult,
  DisplayMode,
  ContentBlock,
} from "../../core/types";

const MCPContext = createContext<MCPBridge | null>(null);

export interface MCPProviderProps {
  children: ReactNode;
  appInfo?: { name: string; version: string };
  appCapabilities?: AppCapabilities;
}

export function MCPProvider({
  children,
  appInfo,
  appCapabilities,
}: MCPProviderProps) {
  const [bridge] = useState(() => new MCPBridge(appInfo, appCapabilities));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bridge.connect().then(() => setReady(true));
  }, [bridge]);

  if (!ready) return null;

  return <MCPContext.Provider value={bridge}>{children}</MCPContext.Provider>;
}

function useMCPBridge(): MCPBridge {
  const bridge = useContext(MCPContext);
  if (!bridge) {
    throw new Error("useMCP* hooks must be used within MCPProvider");
  }
  return bridge;
}

export function useHostContext(): HostContext | null {
  const bridge = useMCPBridge();
  const [context, setContext] = useState<HostContext | null>(
    bridge.getHostContext(),
  );

  useEffect(() => {
    return bridge.onHostContextChanged((ctx) => {
      setContext((prev: HostContext | null) =>
        prev ? { ...prev, ...ctx } : (ctx as HostContext),
      );
    });
  }, [bridge]);

  return context;
}

export function useTheme(): "light" | "dark" {
  const context = useHostContext();
  return context?.theme ?? "light";
}

export function useToolInput<T = Record<string, unknown>>(): T | null {
  const bridge = useMCPBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    return bridge.onToolInput((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

export function useToolInputPartial<T = Record<string, unknown>>(): T | null {
  const bridge = useMCPBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    return bridge.onToolInputPartial((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

export function useToolResult(): ToolResult | null {
  const bridge = useMCPBridge();
  const [result, setResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    return bridge.onToolResult(setResult);
  }, [bridge]);

  return result;
}

export function useToolCancellation(callback: (reason: string) => void): void {
  const bridge = useMCPBridge();

  useEffect(() => {
    return bridge.onToolCancelled(callback);
  }, [bridge, callback]);
}

export function useTeardown(callback: () => Promise<void> | void): void {
  const bridge = useMCPBridge();

  useEffect(() => {
    return bridge.onTeardown(callback);
  }, [bridge, callback]);
}

export function useDisplayMode(): [
  DisplayMode,
  (mode: DisplayMode) => Promise<void>,
] {
  const bridge = useMCPBridge();
  const context = useHostContext();
  const mode = context?.displayMode ?? "inline";

  const setMode = useCallback(
    async (newMode: DisplayMode) => {
      const available = context?.availableDisplayModes ?? [];
      if (available.length > 0 && !available.includes(newMode)) {
        console.warn(
          `Display mode "${newMode}" not available. Available: ${available.join(", ")}`,
        );
      }
      await bridge.requestDisplayMode(newMode);
    },
    [bridge, context?.availableDisplayModes],
  );

  return [mode, setMode];
}

export function useCallTool() {
  const bridge = useMCPBridge();
  return useCallback(
    (name: string, args: Record<string, unknown>) =>
      bridge.callTool(name, args),
    [bridge],
  );
}

export function useOpenLink() {
  const bridge = useMCPBridge();
  return useCallback((url: string) => bridge.openLink(url), [bridge]);
}

export function useSendMessage() {
  const bridge = useMCPBridge();
  return useCallback(
    (text: string) =>
      bridge.sendMessage({
        role: "user",
        content: [{ type: "text", text }],
      }),
    [bridge],
  );
}

export function useUpdateModelContext() {
  const bridge = useMCPBridge();
  return useCallback(
    (ctx: {
      content?: ContentBlock[];
      structuredContent?: Record<string, unknown>;
    }) => bridge.updateModelContext(ctx),
    [bridge],
  );
}

export function useLog() {
  const bridge = useMCPBridge();
  return useCallback(
    (level: "debug" | "info" | "warning" | "error", data: string) =>
      bridge.sendLog(level, data),
    [bridge],
  );
}
