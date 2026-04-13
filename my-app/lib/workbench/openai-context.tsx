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
  type MutableRefObject,
} from "react";
import { useWorkbenchStore } from "./store";
import { handleMockToolCall, type MockToolCallResult } from "./mock-responses";
import { MORPH_TIMING } from "./transition-config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type {
  OpenAIGlobals,
  OpenAIAPI,
  DisplayMode,
  CallToolResponse,
  ModalOptions,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
  View,
  WidgetState,
  WindowOpenAI,
} from "./types";

const DEFAULT_TOOL_CALL_DELAY_MS = 300;
import { SET_GLOBALS_EVENT_TYPE } from "./types";
import { storeFile, getFileUrl } from "./file-store";

interface OpenAIContextValue extends OpenAIGlobals, OpenAIAPI {}

const OpenAIContext = createContext<OpenAIContextValue | null>(null);

interface OpenAIProviderProps {
  children: ReactNode;
}

function isValueEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function buildChangedGlobals(
  prev: OpenAIGlobals | null,
  next: OpenAIGlobals,
): Partial<OpenAIGlobals> {
  if (!prev) return next;
  const changed: Partial<OpenAIGlobals> = {};
  const writable = changed as Record<
    keyof OpenAIGlobals,
    OpenAIGlobals[keyof OpenAIGlobals]
  >;
  (Object.keys(next) as Array<keyof OpenAIGlobals>).forEach((key) => {
    if (!isValueEqual(prev[key], next[key])) {
      writable[key] = next[key];
    }
  });
  return changed;
}

function createOpenAIShim(
  globalsRef: MutableRefObject<OpenAIGlobals>,
  apiRef: MutableRefObject<OpenAIAPI | null>,
): WindowOpenAI {
  const withApi = <T,>(handler: (api: OpenAIAPI) => T, fallback: T): T => {
    const api = apiRef.current;
    return api ? handler(api) : fallback;
  };

  return {
    get theme() {
      return globalsRef.current.theme;
    },
    get locale() {
      return globalsRef.current.locale;
    },
    get displayMode() {
      return globalsRef.current.displayMode;
    },
    get previousDisplayMode() {
      return globalsRef.current.previousDisplayMode;
    },
    get maxHeight() {
      return globalsRef.current.maxHeight;
    },
    get toolInput() {
      return globalsRef.current.toolInput;
    },
    get toolOutput() {
      return globalsRef.current.toolOutput;
    },
    get toolResponseMetadata() {
      return globalsRef.current.toolResponseMetadata;
    },
    get widgetState() {
      return globalsRef.current.widgetState;
    },
    get userAgent() {
      return globalsRef.current.userAgent;
    },
    get safeArea() {
      return globalsRef.current.safeArea;
    },
    get view() {
      return globalsRef.current.view;
    },
    get userLocation() {
      return globalsRef.current.userLocation;
    },

    callTool: (name, args) =>
      withApi(
        (api) => api.callTool(name, args),
        Promise.reject(new Error("OpenAI API not ready")),
      ),
    setWidgetState: (state) => {
      apiRef.current?.setWidgetState(state);
    },
    requestDisplayMode: (args) =>
      withApi(
        (api) => api.requestDisplayMode(args),
        Promise.resolve({ mode: args.mode }),
      ),
    sendFollowUpMessage: (args) =>
      withApi((api) => api.sendFollowUpMessage(args), Promise.resolve()),
    requestClose: () => {
      apiRef.current?.requestClose();
    },
    openExternal: (payload) => {
      apiRef.current?.openExternal(payload);
    },
    notifyIntrinsicHeight: (height) => {
      apiRef.current?.notifyIntrinsicHeight(height);
    },
    requestModal: (options) =>
      withApi((api) => api.requestModal(options), Promise.resolve()),
    uploadFile: (file) =>
      withApi(
        (api) => api.uploadFile(file),
        Promise.reject(new Error("OpenAI API not ready")),
      ),
    getFileDownloadUrl: (args) =>
      withApi(
        (api) => api.getFileDownloadUrl(args),
        Promise.reject(new Error("OpenAI API not ready")),
      ),
  };
}

export function OpenAIProvider({ children }: OpenAIProviderProps) {
  const store = useWorkbenchStore();
  const globals = store.getOpenAIGlobals();
  const reducedMotion = useReducedMotion();
  const globalsRef = useRef(globals);
  const prevGlobalsRef = useRef<OpenAIGlobals | null>(null);
  const apiRef = useRef<OpenAIAPI | null>(null);
  const [openaiReady, setOpenaiReady] = useState(false);

  globalsRef.current = globals;

  const callTool = useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResponse> => {
      store.addConsoleEntry({
        type: "callTool",
        method: `callTool("${name}")`,
        args,
      });

      store.registerSimTool(name);
      const { simulation } = store;
      const simConfig = simulation.tools[name];

      if (simConfig) {
        store.setActiveToolCall({
          toolName: name,
          delay: DEFAULT_TOOL_CALL_DELAY_MS,
          startTime: Date.now(),
        });

        if (simConfig.responseMode === "hang") {
          store.addConsoleEntry({
            type: "callTool",
            method: `callTool("${name}") → [SIMULATED: hang]`,
            result: { _note: "Response withheld to test loading state" },
          });
          return new Promise(() => {});
        }

        await new Promise((resolve) =>
          setTimeout(resolve, DEFAULT_TOOL_CALL_DELAY_MS),
        );
        store.setActiveToolCall(null);

        let result: CallToolResponse;
        const modeLabel = simConfig.responseMode.toUpperCase();

        switch (simConfig.responseMode) {
          case "error":
            result = {
              isError: true,
              content:
                (simConfig.responseData.message as string) ?? "Simulated error",
              _meta: { "openai/widgetSessionId": store.widgetSessionId },
            };
            break;
          default:
            result = {
              structuredContent: simConfig.responseData,
              _meta: { "openai/widgetSessionId": store.widgetSessionId },
            };
            break;
        }

        store.addConsoleEntry({
          type: "callTool",
          method: `callTool("${name}") → [SIMULATED: ${modeLabel}]`,
          result,
        });

        store.setToolOutput(result.structuredContent ?? null);
        store.setToolResponseMetadata(result._meta ?? null);

        if (result._meta?.["openai/closeWidget"] === true) {
          store.setWidgetClosed(true);
        }

        return result;
      }

      if (!store.mockConfig.tools[name]) {
        store.registerTool(name);
      }

      const toolConfig = store.mockConfig.tools[name];
      const activeVariant =
        store.mockConfig.globalEnabled && toolConfig?.activeVariantId
          ? toolConfig.variants.find((v) => v.id === toolConfig.activeVariantId)
          : null;
      const delay = activeVariant?.delay ?? DEFAULT_TOOL_CALL_DELAY_MS;

      store.setActiveToolCall({
        toolName: name,
        delay,
        startTime: Date.now(),
      });

      let result: MockToolCallResult;
      try {
        result = await handleMockToolCall(name, args, store.mockConfig);
      } finally {
        store.setActiveToolCall(null);
      }

      const enrichedMeta = {
        ...(result._meta ?? {}),
        "openai/widgetSessionId": store.widgetSessionId,
      };

      const enrichedResult: CallToolResponse = {
        ...result,
        _meta: enrichedMeta,
      };

      const methodLabel = result._mockVariant
        ? `callTool("${name}") → [MOCK: ${result._mockVariant}]`
        : `callTool("${name}") → response`;

      store.addConsoleEntry({
        type: "callTool",
        method: methodLabel,
        result: enrichedResult,
      });

      store.setToolOutput(enrichedResult.structuredContent ?? null);
      store.setToolResponseMetadata(enrichedResult._meta ?? null);

      if (enrichedResult._meta?.["openai/closeWidget"] === true) {
        store.setWidgetClosed(true);
      }

      return enrichedResult;
    },
    [store],
  );

  const setWidgetState = useCallback(
    (state: WidgetState): void => {
      store.addConsoleEntry({
        type: "setWidgetState",
        method: "setWidgetState",
        args: state,
      });
      store.setWidgetState(state);
    },
    [store],
  );

  const requestDisplayMode = useCallback(
    async (args: { mode: DisplayMode }): Promise<{ mode: DisplayMode }> => {
      const currentMode = store.displayMode;

      store.addConsoleEntry({
        type: "requestDisplayMode",
        method: `requestDisplayMode("${args.mode}")`,
        args,
      });

      if (currentMode === args.mode) {
        return { mode: args.mode };
      }

      if (store.isTransitioning) {
        return { mode: args.mode };
      }

      if (
        reducedMotion ||
        typeof document === "undefined" ||
        !("startViewTransition" in document)
      ) {
        store.setDisplayMode(args.mode);
        return { mode: args.mode };
      }

      store.setTransitioning(true);

      const toFullscreen = args.mode === "fullscreen";
      const root = document.documentElement;
      root.style.setProperty(
        "--morph-radius-from",
        toFullscreen ? "0.75rem" : "0",
      );
      root.style.setProperty(
        "--morph-radius-to",
        toFullscreen ? "0" : "0.75rem",
      );

      (
        document as Document & {
          startViewTransition: (callback: () => void) => void;
        }
      ).startViewTransition(() => {
        store.setDisplayMode(args.mode);
      });

      setTimeout(() => {
        store.setTransitioning(false);
        root.style.removeProperty("--morph-radius-from");
        root.style.removeProperty("--morph-radius-to");
      }, MORPH_TIMING.viewTransitionDuration);

      return { mode: args.mode };
    },
    [store, reducedMotion],
  );

  const sendFollowUpMessage = useCallback(
    async (args: { prompt: string }): Promise<void> => {
      store.addConsoleEntry({
        type: "sendFollowUpMessage",
        method: "sendFollowUpMessage",
        args,
      });
    },
    [store],
  );

  const requestClose = useCallback(() => {
    store.addConsoleEntry({
      type: "requestClose",
      method: "requestClose",
    });
    store.setWidgetClosed(true);
  }, [store]);

  const openExternal = useCallback(
    (payload: { href: string }) => {
      store.addConsoleEntry({
        type: "openExternal",
        method: `openExternal("${payload.href}")`,
        args: payload,
      });
      window.open(payload.href, "_blank", "noopener,noreferrer");
    },
    [store],
  );

  const notifyIntrinsicHeight = useCallback(
    (height: number) => {
      store.addConsoleEntry({
        type: "notifyIntrinsicHeight",
        method: `notifyIntrinsicHeight(${height})`,
        args: { height },
      });
      const nextHeight = Number.isFinite(height) ? Math.max(0, height) : null;
      store.setIntrinsicHeight(nextHeight);
    },
    [store],
  );

  const requestModal = useCallback(
    async (options: ModalOptions): Promise<void> => {
      store.addConsoleEntry({
        type: "requestModal",
        method: `requestModal("${options.title ?? "Modal"}")`,
        args: options,
      });

      store.setView({
        mode: "modal",
        params: options.params ?? null,
      });
    },
    [store],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<UploadFileResponse> => {
      const fileId = storeFile(file);

      store.addConsoleEntry({
        type: "uploadFile",
        method: `uploadFile("${file.name}")`,
        args: { name: file.name, size: file.size, type: file.type },
        result: { fileId },
      });

      return { fileId };
    },
    [store],
  );

  const getFileDownloadUrl = useCallback(
    async (args: { fileId: string }): Promise<GetFileDownloadUrlResponse> => {
      const downloadUrl = getFileUrl(args.fileId);

      store.addConsoleEntry({
        type: "getFileDownloadUrl",
        method: `getFileDownloadUrl("${args.fileId}")`,
        args,
        result: downloadUrl ? { downloadUrl } : { error: "File not found" },
      });

      if (!downloadUrl) {
        throw new Error(`File not found: ${args.fileId}`);
      }

      return { downloadUrl };
    },
    [store],
  );

  apiRef.current = {
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
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const existing = (
      window as Window & { openai?: WindowOpenAI & { __workbench?: boolean } }
    ).openai;

    if (existing?.__workbench) {
      setOpenaiReady(true);
      return;
    }
    if (existing) {
      console.warn(
        "[Workbench] window.openai already exists; skipping shim injection.",
      );
      setOpenaiReady(true);
      return;
    }

    const shim = createOpenAIShim(globalsRef, apiRef);
    Object.defineProperty(shim, "__workbench", { value: true });
    Object.defineProperty(window, "openai", {
      value: shim,
      configurable: false,
      writable: false,
    });
    setOpenaiReady(true);
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const changed = buildChangedGlobals(prevGlobalsRef.current, globals);
    prevGlobalsRef.current = globals;

    if (Object.keys(changed).length === 0) return;
    const event = new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
      detail: { globals: changed },
    });
    window.dispatchEvent(event);
  }, [globals]);

  return (
    <OpenAIContext.Provider value={value}>
      {openaiReady ? children : null}
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

export function usePreviousDisplayMode(): DisplayMode | null {
  return useOpenAiGlobal("previousDisplayMode");
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

export function useView(): View | null {
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
