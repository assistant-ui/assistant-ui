"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ChatGPTBridge } from "./bridge";
import type { HostContext, ToolResult, DisplayMode } from "../../core/types";

const ChatGPTContext = createContext<ChatGPTBridge | null>(null);

export function ChatGPTProvider({ children }: { children: ReactNode }) {
  const [bridge] = useState(() => new ChatGPTBridge());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bridge.connect().then(() => setReady(true));
  }, [bridge]);

  if (!ready) return null;

  return (
    <ChatGPTContext.Provider value={bridge}>{children}</ChatGPTContext.Provider>
  );
}

function useChatGPTBridge(): ChatGPTBridge {
  const bridge = useContext(ChatGPTContext);
  if (!bridge) {
    throw new Error("useChatGPT* hooks must be used within ChatGPTProvider");
  }
  return bridge;
}

export function useHostContext(): HostContext | null {
  const bridge = useChatGPTBridge();
  const [context, setContext] = useState<HostContext | null>(
    bridge.getHostContext(),
  );

  useEffect(() => {
    return bridge.onHostContextChanged((ctx) => {
      setContext((prev: HostContext | null) => ({ ...prev, ...ctx }));
    });
  }, [bridge]);

  return context;
}

export function useTheme(): "light" | "dark" {
  const context = useHostContext();
  return context?.theme ?? "light";
}

export function useToolInput<T = Record<string, unknown>>(): T | null {
  const bridge = useChatGPTBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    return bridge.onToolInput((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

export function useToolResult(): ToolResult | null {
  const bridge = useChatGPTBridge();
  const [result, setResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    return bridge.onToolResult(setResult);
  }, [bridge]);

  return result;
}

export function useDisplayMode(): [
  DisplayMode,
  (mode: DisplayMode) => Promise<void>,
] {
  const bridge = useChatGPTBridge();
  const context = useHostContext();
  const mode = context?.displayMode ?? "inline";

  const setMode = useCallback(
    async (newMode: DisplayMode) => {
      await bridge.requestDisplayMode(newMode);
    },
    [bridge],
  );

  return [mode, setMode];
}

export function useWidgetState<T = Record<string, unknown>>(): [
  T | null,
  (state: T | null) => void,
] {
  const bridge = useChatGPTBridge();
  const [state, setState] = useState<T | null>(
    bridge.getWidgetState() as T | null,
  );

  const setWidgetState = useCallback(
    (newState: T | null) => {
      bridge.setWidgetState(newState as Record<string, unknown> | null);
      setState(newState);
    },
    [bridge],
  );

  return [state, setWidgetState];
}

export function useCallTool() {
  const bridge = useChatGPTBridge();
  return useCallback(
    (name: string, args: Record<string, unknown>) =>
      bridge.callTool(name, args),
    [bridge],
  );
}

export function useOpenLink() {
  const bridge = useChatGPTBridge();
  return useCallback((url: string) => bridge.openLink(url), [bridge]);
}

export function useSendMessage() {
  const bridge = useChatGPTBridge();
  return useCallback(
    (text: string) =>
      bridge.sendMessage({
        role: "user",
        content: [{ type: "text", text }],
      }),
    [bridge],
  );
}

export function useUploadFile() {
  const bridge = useChatGPTBridge();
  return useCallback((file: File) => bridge.uploadFile(file), [bridge]);
}

export function useGetFileDownloadUrl() {
  const bridge = useChatGPTBridge();
  return useCallback(
    (fileId: string) => bridge.getFileDownloadUrl(fileId),
    [bridge],
  );
}

export function useRequestClose() {
  const bridge = useChatGPTBridge();
  return useCallback(() => bridge.requestClose(), [bridge]);
}

export function useRequestModal() {
  const bridge = useChatGPTBridge();
  return useCallback(
    (options: {
      title?: string;
      params?: Record<string, unknown>;
      anchor?: { x: number; y: number; width: number; height: number };
    }) => bridge.requestModal(options),
    [bridge],
  );
}
