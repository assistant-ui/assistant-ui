"use client";

import * as React from "react";
import type {
  AUIGlobals,
  UserLocation,
  ToolResponseMetadata,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
  Theme,
  DisplayMode,
  WidgetState,
  CallToolResponse,
} from "../types/protocol";

interface AUIContextValue extends AUIGlobals {
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  sendFollowUpMessage: (prompt: string) => Promise<void>;
  requestDisplayMode: (mode: DisplayMode) => Promise<{ mode: DisplayMode }>;
  requestModal: (options: {
    title?: string;
    params?: Record<string, unknown>;
  }) => Promise<void>;
  requestClose: () => void;
  openExternal: (href: string) => void;
  notifyIntrinsicHeight: (height: number) => void;
  uploadFile: (file: File) => Promise<UploadFileResponse>;
  getFileDownloadUrl: (fileId: string) => Promise<GetFileDownloadUrlResponse>;
}

const AUIContext = React.createContext<AUIContextValue | null>(null);

interface AUIProviderProps {
  children: React.ReactNode;
}

const DEFAULT_GLOBALS: AUIGlobals = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  previousDisplayMode: null,
  maxHeight: 800,
  toolInput: {},
  toolOutput: null,
  widgetState: null,
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
  safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
  userLocation: null,
  toolResponseMetadata: null,
  view: null,
};

export function AUIProvider({ children }: AUIProviderProps) {
  const [globals, setGlobals] = React.useState<AUIGlobals>(() => {
    if (typeof window === "undefined" || !window.aui) {
      return DEFAULT_GLOBALS;
    }
    return {
      theme: window.aui.theme,
      locale: window.aui.locale,
      displayMode: window.aui.displayMode,
      previousDisplayMode: window.aui.previousDisplayMode,
      maxHeight: window.aui.maxHeight,
      toolInput: window.aui.toolInput,
      toolOutput: window.aui.toolOutput,
      widgetState: window.aui.widgetState,
      userAgent: window.aui.userAgent,
      safeArea: window.aui.safeArea,
      userLocation: window.aui.userLocation,
      toolResponseMetadata: window.aui.toolResponseMetadata,
      view: window.aui.view,
    };
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        globals: Partial<AUIGlobals>;
      }>;
      setGlobals((prev) => ({ ...prev, ...customEvent.detail.globals }));
    };

    window.addEventListener("aui:set_globals", handler);
    return () => window.removeEventListener("aui:set_globals", handler);
  }, []);

  const value = React.useMemo<AUIContextValue>(
    () => ({
      ...globals,
      callTool: async (name, args) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.callTool(name, args);
      },
      setWidgetState: (state) => {
        window.aui?.setWidgetState(state);
      },
      sendFollowUpMessage: async (prompt) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.sendFollowUpMessage({ prompt });
      },
      requestDisplayMode: async (mode) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.requestDisplayMode({ mode });
      },
      requestModal: async (options) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.requestModal(options);
      },
      requestClose: () => {
        window.aui?.requestClose();
      },
      openExternal: (href) => {
        if (window.aui) {
          window.aui.openExternal({ href });
        } else {
          window.open(href, "_blank", "noopener,noreferrer");
        }
      },
      notifyIntrinsicHeight: (height) => {
        if (window.aui) {
          window.aui.notifyIntrinsicHeight(height);
        } else {
          window.parent?.postMessage({ type: "resize", payload: height }, "*");
        }
      },
      uploadFile: async (file) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.uploadFile(file);
      },
      getFileDownloadUrl: async (fileId) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.getFileDownloadUrl({ fileId });
      },
    }),
    [globals],
  );

  return <AUIContext.Provider value={value}>{children}</AUIContext.Provider>;
}

export function useAUI(): AUIContextValue {
  const context = React.useContext(AUIContext);
  if (!context) {
    throw new Error("useAUI must be used within an AUIProvider");
  }
  return context;
}

export function useTheme(): Theme {
  return useAUI().theme;
}

export function useLocale(): string {
  return useAUI().locale;
}

export function useDisplayMode(): DisplayMode {
  return useAUI().displayMode;
}

export function useToolInput<T = Record<string, unknown>>(): T {
  return useAUI().toolInput as T;
}

export function useToolOutput<T = Record<string, unknown>>(): T | null {
  return useAUI().toolOutput as T | null;
}

export function useWidgetState<T extends Record<string, unknown>>(
  defaultState?: T,
): readonly [T | null, (state: T | null) => void] {
  const context = useAUI();
  const currentState =
    (context.widgetState as T | null) ?? defaultState ?? null;

  const setState = React.useCallback(
    (state: T | null) => {
      context.setWidgetState(state);
    },
    [context],
  );

  return [currentState, setState] as const;
}

export function useCallTool() {
  const context = useAUI();
  return context.callTool;
}

export function useRequestDisplayMode() {
  const context = useAUI();
  return context.requestDisplayMode;
}

export function useSendFollowUpMessage() {
  const context = useAUI();
  return context.sendFollowUpMessage;
}

export function useMaxHeight(): number {
  return useAUI().maxHeight;
}

export function useUserAgent() {
  return useAUI().userAgent;
}

export function useSafeArea() {
  return useAUI().safeArea;
}

export function useUserLocation(): UserLocation | null {
  return useAUI().userLocation;
}

export function useToolResponseMetadata(): ToolResponseMetadata | null {
  return useAUI().toolResponseMetadata;
}

export function useUploadFile() {
  return React.useCallback(async (file: File) => {
    if (!window.aui) throw new Error("AUI not available");
    return window.aui.uploadFile(file);
  }, []);
}

export function useGetFileDownloadUrl() {
  return React.useCallback(async (fileId: string) => {
    if (!window.aui) throw new Error("AUI not available");
    return window.aui.getFileDownloadUrl({ fileId });
  }, []);
}
