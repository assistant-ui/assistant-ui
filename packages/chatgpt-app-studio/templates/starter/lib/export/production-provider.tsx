"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  OpenAIGlobals,
  OpenAIAPI,
  DisplayMode,
  CallToolResponse,
  ModalOptions,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
  WidgetState,
  WindowOpenAI,
} from "../workbench/types";
import { SET_GLOBALS_EVENT_TYPE } from "../workbench/types";
import { installOpenAIBridge, getOpenAIBridge } from "./bridge";

interface OpenAIContextValue extends OpenAIGlobals, OpenAIAPI {}

const OpenAIContext = createContext<OpenAIContextValue | null>(null);

interface ProductionOpenAIProviderProps {
  children: ReactNode;
}

const DEFAULT_GLOBALS: OpenAIGlobals = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  previousDisplayMode: null,
  maxHeight: 600,
  toolInput: {},
  toolOutput: null,
  toolResponseMetadata: null,
  widgetState: null,
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
  safeArea: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  view: null,
  userLocation: null,
};

export function ProductionOpenAIProvider({
  children,
}: ProductionOpenAIProviderProps) {
  const [globals, setGlobals] = useState<OpenAIGlobals>(DEFAULT_GLOBALS);
  const [ready, setReady] = useState(false);
  const bridgeRef = useRef<WindowOpenAI | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    try {
      bridgeRef.current = installOpenAIBridge();
      setGlobals({
        theme: bridgeRef.current.theme,
        locale: bridgeRef.current.locale,
        displayMode: bridgeRef.current.displayMode,
        previousDisplayMode: bridgeRef.current.previousDisplayMode,
        maxHeight: bridgeRef.current.maxHeight,
        toolInput: bridgeRef.current.toolInput,
        toolOutput: bridgeRef.current.toolOutput,
        toolResponseMetadata: bridgeRef.current.toolResponseMetadata,
        widgetState: bridgeRef.current.widgetState,
        userAgent: bridgeRef.current.userAgent,
        safeArea: bridgeRef.current.safeArea,
        view: bridgeRef.current.view,
        userLocation: bridgeRef.current.userLocation,
      });
      setReady(true);
    } catch (error) {
      console.error(
        "[ProductionOpenAIProvider] Failed to install bridge:",
        error,
      );
      const existing = getOpenAIBridge();
      if (existing) {
        bridgeRef.current = existing;
        setReady(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleGlobalsChange(event: CustomEvent) {
      const changedGlobals = event.detail?.globals as Partial<OpenAIGlobals>;
      if (changedGlobals) {
        setGlobals((prev) => ({ ...prev, ...changedGlobals }));
      }
    }

    window.addEventListener(
      SET_GLOBALS_EVENT_TYPE,
      handleGlobalsChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        SET_GLOBALS_EVENT_TYPE,
        handleGlobalsChange as EventListener,
      );
    };
  }, []);

  const callTool = useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResponse> => {
      const bridge = bridgeRef.current;
      if (!bridge) {
        throw new Error("OpenAI bridge not ready");
      }
      return bridge.callTool(name, args);
    },
    [],
  );

  const setWidgetState = useCallback((state: WidgetState): void => {
    bridgeRef.current?.setWidgetState(state);
  }, []);

  const requestDisplayMode = useCallback(
    async (args: { mode: DisplayMode }): Promise<{ mode: DisplayMode }> => {
      const bridge = bridgeRef.current;
      if (!bridge) {
        return { mode: args.mode };
      }
      return bridge.requestDisplayMode(args);
    },
    [],
  );

  const sendFollowUpMessage = useCallback(
    async (args: { prompt: string }): Promise<void> => {
      await bridgeRef.current?.sendFollowUpMessage(args);
    },
    [],
  );

  const requestClose = useCallback(() => {
    bridgeRef.current?.requestClose();
  }, []);

  const openExternal = useCallback((payload: { href: string }) => {
    bridgeRef.current?.openExternal(payload);
  }, []);

  const notifyIntrinsicHeight = useCallback((height: number) => {
    bridgeRef.current?.notifyIntrinsicHeight(height);
  }, []);

  const requestModal = useCallback(
    async (options: ModalOptions): Promise<void> => {
      await bridgeRef.current?.requestModal(options);
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<UploadFileResponse> => {
      const bridge = bridgeRef.current;
      if (!bridge) {
        throw new Error("OpenAI bridge not ready");
      }
      return bridge.uploadFile(file);
    },
    [],
  );

  const getFileDownloadUrl = useCallback(
    async (args: { fileId: string }): Promise<GetFileDownloadUrlResponse> => {
      const bridge = bridgeRef.current;
      if (!bridge) {
        throw new Error("OpenAI bridge not ready");
      }
      return bridge.getFileDownloadUrl(args);
    },
    [],
  );

  const value = useMemo<OpenAIContextValue>(
    () => ({
      theme: globals.theme,
      locale: globals.locale,
      displayMode: globals.displayMode,
      previousDisplayMode: globals.previousDisplayMode,
      maxHeight: globals.maxHeight,
      toolInput: globals.toolInput,
      toolOutput: globals.toolOutput,
      toolResponseMetadata: globals.toolResponseMetadata,
      widgetState: globals.widgetState,
      userAgent: globals.userAgent,
      safeArea: globals.safeArea,
      view: globals.view,
      userLocation: globals.userLocation,
      callTool,
      setWidgetState,
      requestDisplayMode,
      sendFollowUpMessage,
      requestClose,
      openExternal,
      notifyIntrinsicHeight,
      requestModal,
      uploadFile,
      getFileDownloadUrl,
    }),
    [
      globals,
      callTool,
      setWidgetState,
      requestDisplayMode,
      sendFollowUpMessage,
      requestClose,
      openExternal,
      notifyIntrinsicHeight,
      requestModal,
      uploadFile,
      getFileDownloadUrl,
    ],
  );

  return (
    <OpenAIContext.Provider value={value}>
      {ready ? children : null}
    </OpenAIContext.Provider>
  );
}

export function useOpenAI(): OpenAIContextValue {
  const context = useContext(OpenAIContext);
  if (!context) {
    throw new Error("useOpenAI must be used within an OpenAIProvider");
  }
  return context;
}

export function useOpenAiGlobal<K extends keyof OpenAIGlobals>(
  key: K,
): OpenAIGlobals[K] {
  const context = useOpenAI();
  return context[key];
}

export function useToolInput<T = Record<string, unknown>>(): T {
  return useOpenAiGlobal("toolInput") as T;
}

export function useToolOutput<T = Record<string, unknown>>(): T | null {
  return useOpenAiGlobal("toolOutput") as T | null;
}

export function useTheme(): "light" | "dark" {
  return useOpenAiGlobal("theme");
}

export function useDisplayMode(): DisplayMode {
  return useOpenAiGlobal("displayMode");
}

export function useLocale(): string {
  return useOpenAiGlobal("locale");
}

export function useWidgetState<T extends Record<string, unknown>>(
  defaultState?: T,
): readonly [
  T | null,
  (state: T | null | ((prev: T | null) => T | null)) => void,
] {
  const context = useOpenAI();
  const currentState =
    (context.widgetState as T | null) ?? defaultState ?? null;

  const setState = useCallback(
    (stateOrUpdater: T | null | ((prev: T | null) => T | null)) => {
      const newState =
        typeof stateOrUpdater === "function"
          ? stateOrUpdater(currentState)
          : stateOrUpdater;
      context.setWidgetState(newState);
    },
    [context, currentState],
  );

  return [currentState, setState] as const;
}

export function useCallTool() {
  const context = useOpenAI();
  return context.callTool;
}

export function useRequestDisplayMode() {
  const context = useOpenAI();
  return context.requestDisplayMode;
}

export function useSendFollowUpMessage() {
  const context = useOpenAI();
  return context.sendFollowUpMessage;
}

export function useView() {
  return useOpenAiGlobal("view");
}

export function useUploadFile() {
  const context = useOpenAI();
  return context.uploadFile;
}

export function useGetFileDownloadUrl() {
  const context = useOpenAI();
  return context.getFileDownloadUrl;
}

export function useOpenExternal() {
  const context = useOpenAI();
  return context.openExternal;
}

export function useMaxHeight(): number {
  return useOpenAiGlobal("maxHeight");
}

export function useUserAgent() {
  return useOpenAiGlobal("userAgent");
}

export function useSafeArea() {
  return useOpenAiGlobal("safeArea");
}

export function useUserLocation() {
  return useOpenAiGlobal("userLocation");
}

export function useToolResponseMetadata() {
  return useOpenAiGlobal("toolResponseMetadata");
}

export function useRequestClose() {
  const context = useOpenAI();
  return context.requestClose;
}

export function useNotifyIntrinsicHeight() {
  const context = useOpenAI();
  return context.notifyIntrinsicHeight;
}

export function useRequestModal() {
  const context = useOpenAI();
  return context.requestModal;
}

export function usePreviousDisplayMode(): DisplayMode | null {
  const [previous, setPrevious] = useState<DisplayMode | null>(null);
  const displayMode = useDisplayMode();
  const displayModeRef = useRef(displayMode);

  useEffect(() => {
    if (displayModeRef.current !== displayMode) {
      setPrevious(displayModeRef.current);
      displayModeRef.current = displayMode;
    }
  }, [displayMode]);

  return previous;
}
