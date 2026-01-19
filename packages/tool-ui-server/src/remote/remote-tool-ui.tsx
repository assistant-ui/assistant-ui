"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";
import { MessageBridge, MessageBridgeHandlers } from "./message-bridge";
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
  ModalOptions,
} from "../types/protocol";
import { DEFAULT_GLOBALS } from "../runtime/bridge-script";

export interface RemoteToolUIProps {
  src: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  theme?: Theme;
  locale?: string;
  displayMode?: DisplayMode;
  maxHeight?: number;
  widgetState?: WidgetState;
  onWidgetStateChange?: (state: WidgetState) => void;
  onCallTool?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  onSendFollowUpMessage?: (args: { prompt: string }) => Promise<void>;
  onRequestDisplayMode?: (args: {
    mode: DisplayMode;
  }) => Promise<{ mode: DisplayMode }>;
  onRequestModal?: (options: ModalOptions) => Promise<void>;
  onRequestClose?: () => void;
  onOpenExternal?: (payload: { href: string }) => void;
  onUploadFile?: (file: {
    name: string;
    type: string;
    size: number;
    data: string;
  }) => Promise<UploadFileResponse>;
  onGetFileDownloadUrl?: (args: {
    fileId: string;
  }) => Promise<GetFileDownloadUrlResponse>;
  onAction?: ((actionId: string, payload?: unknown) => void) | undefined;
  onAddResult?: ((result: unknown) => void) | undefined;
  fallback?: React.ReactNode | undefined;
  errorFallback?: React.ReactNode | undefined;
  className?: string | undefined;
  userLocation?: UserLocation | null;
  toolResponseMetadata?: ToolResponseMetadata | null;
  /** @deprecated Use toolInput and toolOutput instead */
  props?: Record<string, unknown>;
}

export const RemoteToolUI: React.FC<RemoteToolUIProps> = ({
  src,
  toolName,
  toolInput,
  toolOutput,
  theme = "light",
  locale = "en-US",
  displayMode: initialDisplayMode = "inline",
  maxHeight = 800,
  widgetState = null,
  onWidgetStateChange,
  onCallTool,
  onSendFollowUpMessage,
  onRequestDisplayMode,
  onRequestModal,
  onRequestClose,
  onOpenExternal,
  onUploadFile,
  onGetFileDownloadUrl,
  onAction,
  onAddResult,
  fallback,
  errorFallback,
  className,
  userLocation,
  toolResponseMetadata,
  props: legacyProps,
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const bridgeRef = React.useRef<MessageBridge | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [height, setHeight] = React.useState(100);
  const [error, setError] = React.useState<string | null>(null);
  const [displayMode, setDisplayMode] =
    React.useState<DisplayMode>(initialDisplayMode);
  const [isClosed, setIsClosed] = React.useState(false);

  const iframeName = React.useMemo(() => `tool-ui-${crypto.randomUUID()}`, []);

  const expectedOrigin = React.useMemo(() => {
    try {
      return new URL(src).origin;
    } catch {
      return null;
    }
  }, [src]);

  const resolvedToolInput = legacyProps?.["args"]
    ? (legacyProps["args"] as Record<string, unknown>)
    : toolInput;
  const resolvedToolOutput = legacyProps?.["result"]
    ? (legacyProps["result"] as Record<string, unknown>)
    : toolOutput;

  const globals = React.useMemo<AUIGlobals>(
    () => ({
      theme,
      locale,
      displayMode,
      previousDisplayMode: null,
      maxHeight,
      toolInput: resolvedToolInput,
      toolOutput: resolvedToolOutput,
      widgetState,
      userAgent: DEFAULT_GLOBALS.userAgent,
      safeArea: DEFAULT_GLOBALS.safeArea,
      userLocation: userLocation ?? null,
      toolResponseMetadata: toolResponseMetadata ?? null,
      view: null,
    }),
    [
      theme,
      locale,
      displayMode,
      maxHeight,
      resolvedToolInput,
      resolvedToolOutput,
      widgetState,
      userLocation,
      toolResponseMetadata,
    ],
  );

  const callbackRefs = React.useRef({
    onCallTool,
    onWidgetStateChange,
    onSendFollowUpMessage,
    onRequestDisplayMode,
    onRequestModal,
    onRequestClose,
    onOpenExternal,
    onUploadFile,
    onGetFileDownloadUrl,
  });
  callbackRefs.current = {
    onCallTool,
    onWidgetStateChange,
    onSendFollowUpMessage,
    onRequestDisplayMode,
    onRequestModal,
    onRequestClose,
    onOpenExternal,
    onUploadFile,
    onGetFileDownloadUrl,
  };

  const handlers = React.useMemo<MessageBridgeHandlers>(
    () => ({
      callTool: async (name, args) => {
        if (!callbackRefs.current.onCallTool) {
          throw new Error("callTool not supported");
        }
        return callbackRefs.current.onCallTool(name, args);
      },
      setWidgetState: (state) => {
        callbackRefs.current.onWidgetStateChange?.(state);
      },
      sendFollowUpMessage: async (args) => {
        if (!callbackRefs.current.onSendFollowUpMessage) {
          throw new Error("sendFollowUpMessage not supported");
        }
        return callbackRefs.current.onSendFollowUpMessage(args);
      },
      requestDisplayMode: async (args) => {
        setDisplayMode(args.mode);
        if (callbackRefs.current.onRequestDisplayMode) {
          return callbackRefs.current.onRequestDisplayMode(args);
        }
        return { mode: args.mode };
      },
      requestModal: async (options) => {
        if (!callbackRefs.current.onRequestModal) {
          throw new Error("requestModal not supported");
        }
        return callbackRefs.current.onRequestModal(options);
      },
      requestClose: () => {
        setIsClosed(true);
        setDisplayMode("inline");
        callbackRefs.current.onRequestClose?.();
      },
      openExternal: (payload) => {
        if (callbackRefs.current.onOpenExternal) {
          callbackRefs.current.onOpenExternal(payload);
        } else {
          window.open(payload.href, "_blank", "noopener,noreferrer");
        }
      },
      notifyIntrinsicHeight: (h) => {
        setHeight(Math.min(h, maxHeight));
      },
      uploadFile: async (fileData) => {
        if (!callbackRefs.current.onUploadFile) {
          throw new Error("uploadFile not supported");
        }
        return callbackRefs.current.onUploadFile(fileData);
      },
      getFileDownloadUrl: async (args) => {
        if (!callbackRefs.current.onGetFileDownloadUrl) {
          throw new Error("getFileDownloadUrl not supported");
        }
        return callbackRefs.current.onGetFileDownloadUrl(args);
      },
    }),
    [maxHeight],
  );

  const globalsRef = React.useRef(globals);
  globalsRef.current = globals;

  React.useEffect(() => {
    if (!iframeRef.current || !expectedOrigin) return;

    const legacyHandlers = {
      onReady: () => {
        setStatus("ready");
        bridgeRef.current?.sendGlobals(globalsRef.current, {
          toolName,
          isInitial: true,
        });
      },
      onAction: onAction,
      onAddResult: onAddResult,
      onResize: (h: number) => setHeight(Math.min(h, maxHeight)),
      onError: (err: string) => {
        setStatus("error");
        setError(err);
      },
    };

    bridgeRef.current = new MessageBridge(handlers, legacyHandlers);
    bridgeRef.current.attach(iframeRef.current);

    return () => {
      bridgeRef.current?.detach();
      bridgeRef.current = null;
    };
  }, [expectedOrigin, handlers, onAction, onAddResult, maxHeight, toolName]);

  React.useEffect(() => {
    if (status === "ready" && bridgeRef.current) {
      bridgeRef.current.sendGlobals(globals, { toolName });
    }
  }, [status, globals, toolName]);

  React.useEffect(() => {
    if (toolResponseMetadata?.closeWidget && onRequestClose) {
      onRequestClose();
    }
  }, [toolResponseMetadata?.closeWidget, onRequestClose]);

  if (!expectedOrigin) {
    return (
      errorFallback ?? <div className="tool-ui-error">Invalid source URL</div>
    );
  }

  if (status === "error") {
    return (
      errorFallback ?? (
        <div className="tool-ui-error">
          <p>Failed to load remote component</p>
          {error && <pre>{error}</pre>}
        </div>
      )
    );
  }

  if (isClosed) {
    return null;
  }

  const isFullscreen = displayMode === "fullscreen";
  const isPip = displayMode === "pip";

  const loadingContent =
    status === "loading" &&
    (fallback ?? (
      <div className={isPip ? "p-4" : "tool-ui-remote-loading"}>
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    ));

  const iframeContent = (
    <>
      {loadingContent}
      <iframe
        ref={iframeRef}
        src={src}
        name={iframeName}
        title={`Tool UI: ${toolName}`}
        sandbox="allow-scripts allow-forms"
        scrolling="auto"
        style={
          isPip
            ? { height: `${Math.min(height, 320)}px` }
            : isFullscreen
              ? { height: "100%", width: "100%" }
              : { height: `${height}px` }
        }
        className={cn(
          "w-full",
          toolResponseMetadata?.prefersBorder
            ? "border border-border"
            : "border-0",
          isFullscreen ? "h-full" : "",
        )}
      />
    </>
  );

  if (isFullscreen) {
    return createPortal(
      <div
        className="fixed inset-0 flex flex-col bg-background"
        style={{ zIndex: 99999 }}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b bg-background px-4 py-2"
          role="banner"
        >
          <span className="font-medium">{toolName}</span>
          <button
            onClick={() => setDisplayMode("inline")}
            className="rounded-md px-3 py-1 text-sm hover:bg-muted"
            aria-label="Exit fullscreen"
          >
            Exit Fullscreen
          </button>
        </div>
        <div className="h-full min-h-0 flex-1 overflow-hidden">
          {iframeContent}
        </div>
      </div>,
      document.body,
    );
  }

  if (isPip) {
    return createPortal(
      <div className="fixed right-4 bottom-4 z-50 flex max-h-96 w-80 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <div
          className="flex items-center justify-between border-b bg-muted/50 px-3 py-2"
          role="banner"
        >
          <span className="truncate font-medium text-sm">{toolName}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setDisplayMode("fullscreen")}
              className="rounded p-1 text-xs hover:bg-muted"
              aria-label="Expand to fullscreen"
              title="Fullscreen"
            >
              ⛶
            </button>
            <button
              onClick={() => setDisplayMode("inline")}
              className="rounded p-1 text-xs hover:bg-muted"
              aria-label="Exit PiP"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">{iframeContent}</div>
      </div>,
      document.body,
    );
  }

  return (
    <div className={cn("tool-ui-remote-container", className)}>
      {iframeContent}
    </div>
  );
};
