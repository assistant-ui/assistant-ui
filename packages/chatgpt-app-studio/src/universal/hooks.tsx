"use client";

import { useEffect, useState, useCallback } from "react";
import { useUniversalBridge, usePlatform } from "./provider";
import type {
  HostContext,
  ToolResult,
  DisplayMode,
  ContentBlock,
} from "../core/types";
import type { HostCapabilities } from "../core/capabilities";

export function useHostContext(): HostContext | null {
  const bridge = useUniversalBridge();
  const [context, setContext] = useState<HostContext | null>(
    bridge?.getHostContext() ?? null,
  );

  useEffect(() => {
    if (!bridge) return;
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

export function useCapabilities(): HostCapabilities | null {
  const bridge = useUniversalBridge();
  return bridge?.capabilities ?? null;
}

export function useToolInput<T = Record<string, unknown>>(): T | null {
  const bridge = useUniversalBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    if (!bridge) return;
    return bridge.onToolInput((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

export function useToolInputPartial<T = Record<string, unknown>>(): T | null {
  const bridge = useUniversalBridge();
  const platform = usePlatform();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    if (!bridge || platform !== "mcp") return;
    if (!bridge.onToolInputPartial) return;
    return bridge.onToolInputPartial((args) => setInput(args as T));
  }, [bridge, platform]);

  return input;
}

export function useToolResult(): ToolResult | null {
  const bridge = useUniversalBridge();
  const [result, setResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    if (!bridge) return;
    return bridge.onToolResult(setResult);
  }, [bridge]);

  return result;
}

export function useDisplayMode(): [
  DisplayMode,
  (mode: DisplayMode) => Promise<void>,
] {
  const bridge = useUniversalBridge();
  const context = useHostContext();
  const mode = context?.displayMode ?? "inline";

  const setMode = useCallback(
    async (newMode: DisplayMode) => {
      if (!bridge) return;
      await bridge.requestDisplayMode(newMode);
    },
    [bridge],
  );

  return [mode, setMode];
}

export function useCallTool() {
  const bridge = useUniversalBridge();
  return useCallback(
    async (name: string, args: Record<string, unknown>) => {
      if (!bridge) throw new Error("Bridge not available");
      return bridge.callTool(name, args);
    },
    [bridge],
  );
}

export function useOpenLink() {
  const bridge = useUniversalBridge();
  return useCallback(
    async (url: string) => {
      if (!bridge) throw new Error("Bridge not available");
      return bridge.openLink(url);
    },
    [bridge],
  );
}

export function useSendMessage() {
  const bridge = useUniversalBridge();
  return useCallback(
    async (text: string) => {
      if (!bridge?.sendMessage) throw new Error("sendMessage not available");
      return bridge.sendMessage({
        role: "user",
        content: [{ type: "text", text }],
      });
    },
    [bridge],
  );
}

export function useUpdateModelContext() {
  const bridge = useUniversalBridge();
  const platform = usePlatform();

  return useCallback(
    async (ctx: {
      content?: ContentBlock[];
      structuredContent?: Record<string, unknown>;
    }) => {
      if (platform !== "mcp") {
        console.warn("updateModelContext is only available on MCP");
        return;
      }
      if (!bridge?.updateModelContext) {
        throw new Error("updateModelContext not available");
      }
      return bridge.updateModelContext(ctx);
    },
    [bridge, platform],
  );
}

export function useWidgetState<T = Record<string, unknown>>(): [
  T | null,
  (state: T | null) => void,
] {
  const bridge = useUniversalBridge();
  const platform = usePlatform();
  const [state, setState] = useState<T | null>(() => {
    if (platform !== "chatgpt" || !bridge?.getWidgetState) return null;
    return bridge.getWidgetState() as T | null;
  });

  const setWidgetState = useCallback(
    (newState: T | null) => {
      if (platform !== "chatgpt") {
        console.warn("widgetState is only available on ChatGPT");
        return;
      }
      if (!bridge?.setWidgetState) return;
      bridge.setWidgetState(newState as Record<string, unknown> | null);
      setState(newState);
    },
    [bridge, platform],
  );

  return [state, setWidgetState];
}

export function useLog() {
  const bridge = useUniversalBridge();
  const platform = usePlatform();

  return useCallback(
    (level: "debug" | "info" | "warning" | "error", data: string) => {
      if (platform !== "mcp") {
        console.warn("Structured logging is only available on MCP");
        console.log(`[${level}]`, data);
        return;
      }
      if (!bridge?.sendLog) return;
      bridge.sendLog(level, data);
    },
    [bridge, platform],
  );
}
