import type {
  OpenAIGlobals,
  OpenAIAPI,
  WindowOpenAI,
  DisplayMode,
  CallToolResponse,
  ModalOptions,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
  ParentToIframeMessage,
  IframeToParentMessage,
  WidgetState,
} from "../workbench/types";
import { SET_GLOBALS_EVENT_TYPE } from "../workbench/types";

type PendingCall = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

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

function generateCallId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function updateThemeClass(theme: "light" | "dark"): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

let bridgeInitialized = false;

function createOpenAIBridge(): WindowOpenAI {
  const pendingCalls = new Map<string, PendingCall>();
  let globals: OpenAIGlobals = { ...DEFAULT_GLOBALS };
  let previousGlobals: OpenAIGlobals | null = null;

  function dispatchGlobalsChange(changedGlobals: Partial<OpenAIGlobals>) {
    if (typeof window === "undefined") return;

    const event = new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
      detail: { globals: changedGlobals },
    });
    window.dispatchEvent(event);
  }

  function buildChangedGlobals(
    prev: OpenAIGlobals | null,
    next: OpenAIGlobals,
  ): Partial<OpenAIGlobals> {
    if (!prev) return next;

    const changed: Partial<OpenAIGlobals> = {};
    (Object.keys(next) as Array<keyof OpenAIGlobals>).forEach((key) => {
      const prevVal = JSON.stringify(prev[key]);
      const nextVal = JSON.stringify(next[key]);
      if (prevVal !== nextVal) {
        (changed as Record<string, unknown>)[key] = next[key];
      }
    });
    return changed;
  }

  function handleMessage(event: MessageEvent) {
    const message = event.data as ParentToIframeMessage;

    if (!message || typeof message !== "object" || !message.type) {
      return;
    }

    switch (message.type) {
      case "OPENAI_SET_GLOBALS": {
        previousGlobals = globals;
        globals = { ...DEFAULT_GLOBALS, ...message.globals };
        const changed = buildChangedGlobals(previousGlobals, globals);
        if (Object.keys(changed).length > 0) {
          if (changed.theme) {
            updateThemeClass(changed.theme);
          }
          dispatchGlobalsChange(changed);
        }
        break;
      }

      case "OPENAI_METHOD_RESPONSE": {
        const pending = pendingCalls.get(message.id);
        if (pending) {
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.result);
          }
          pendingCalls.delete(message.id);
        }
        break;
      }
    }
  }

  function callMethod<T>(method: keyof OpenAIAPI, args: unknown[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = generateCallId();
      pendingCalls.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      const message: IframeToParentMessage = {
        type: "OPENAI_METHOD_CALL",
        id,
        method,
        args,
      };

      window.parent.postMessage(message, "*");
    });
  }

  if (typeof window !== "undefined" && !bridgeInitialized) {
    window.addEventListener("message", handleMessage);
    bridgeInitialized = true;
  }

  const api: OpenAIAPI = {
    callTool: (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResponse> => {
      return callMethod("callTool", [name, args]);
    },

    requestClose: (): void => {
      callMethod("requestClose", []);
    },

    sendFollowUpMessage: (args: { prompt: string }): Promise<void> => {
      return callMethod("sendFollowUpMessage", [args]);
    },

    openExternal: (payload: { href: string }): void => {
      callMethod("openExternal", [payload]);
    },

    requestDisplayMode: (args: {
      mode: DisplayMode;
    }): Promise<{ mode: DisplayMode }> => {
      return callMethod("requestDisplayMode", [args]);
    },

    setWidgetState: (state: WidgetState): void => {
      callMethod("setWidgetState", [state]);
    },

    notifyIntrinsicHeight: (height: number): void => {
      callMethod("notifyIntrinsicHeight", [height]);
    },

    requestModal: (options: ModalOptions): Promise<void> => {
      return callMethod("requestModal", [options]);
    },

    uploadFile: (file: File): Promise<UploadFileResponse> => {
      return callMethod("uploadFile", [file]);
    },

    getFileDownloadUrl: (args: {
      fileId: string;
    }): Promise<GetFileDownloadUrlResponse> => {
      return callMethod("getFileDownloadUrl", [args]);
    },
  };

  const bridge: WindowOpenAI = {
    get theme() {
      return globals.theme;
    },
    get locale() {
      return globals.locale;
    },
    get displayMode() {
      return globals.displayMode;
    },
    get previousDisplayMode() {
      return globals.previousDisplayMode;
    },
    get maxHeight() {
      return globals.maxHeight;
    },
    get toolInput() {
      return globals.toolInput;
    },
    get toolOutput() {
      return globals.toolOutput;
    },
    get toolResponseMetadata() {
      return globals.toolResponseMetadata;
    },
    get widgetState() {
      return globals.widgetState;
    },
    get userAgent() {
      return globals.userAgent;
    },
    get safeArea() {
      return globals.safeArea;
    },
    get view() {
      return globals.view;
    },
    get userLocation() {
      return globals.userLocation;
    },
    ...api,
  };

  return bridge;
}

export function installOpenAIBridge(): WindowOpenAI {
  if (typeof window === "undefined") {
    throw new Error("OpenAI bridge can only be installed in browser");
  }

  const existing = (
    window as Window & { openai?: WindowOpenAI & { __production?: boolean } }
  ).openai;

  if (existing?.__production) {
    return existing;
  }

  if (existing) {
    console.warn(
      "[OpenAI Bridge] window.openai already exists; skipping installation.",
    );
    return existing;
  }

  const bridge = createOpenAIBridge();
  Object.defineProperty(bridge, "__production", { value: true });
  Object.defineProperty(window, "openai", {
    value: bridge,
    configurable: false,
    writable: false,
  });

  return bridge;
}

export function getOpenAIBridge(): WindowOpenAI | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { openai?: WindowOpenAI }).openai ?? null;
}
