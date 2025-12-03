"use client";

import { useEffect, useMemo, useRef } from "react";
import { SafeContentFrame, type RenderedFrame } from "safe-content-frame";
import type {
  SkybridgeRuntime,
  SkybridgeState,
  SkybridgeCallbacks,
  SkybridgeConnection,
  SkybridgeController,
} from "./types";

export interface OpenSkybridgeProps
  extends Partial<SkybridgeState>,
    SkybridgeCallbacks {
  runtime: SkybridgeRuntime;
  payload: string;
}

const DEFAULT_STATE: SkybridgeState = {
  theme: "light",
  userAgent: {
    device: { type: "unknown" },
    capabilities: { hover: false, touch: false },
  },
  locale: "en-US",
  maxHeight: 0,
  displayMode: "inline",
  safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
  toolInput: {},
  toolOutput: null,
  toolResponseMetadata: null,
  widgetState: null,
};

function injectRuntimeCode(payload: string, runtimeCode: string): string {
  if (payload.includes("<head>")) {
    return payload.replace("<head>", `<head>${runtimeCode}`);
  }
  if (payload.includes("<html>")) {
    return payload.replace("<html>", `<html><head>${runtimeCode}</head>`);
  }
  return runtimeCode + payload;
}

async function hashPayload(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function OpenSkybridge({
  runtime,
  payload,
  theme = DEFAULT_STATE.theme,
  userAgent = DEFAULT_STATE.userAgent,
  locale = DEFAULT_STATE.locale,
  maxHeight = DEFAULT_STATE.maxHeight,
  displayMode = DEFAULT_STATE.displayMode,
  safeArea = DEFAULT_STATE.safeArea,
  toolInput = DEFAULT_STATE.toolInput,
  toolOutput = DEFAULT_STATE.toolOutput,
  toolResponseMetadata = DEFAULT_STATE.toolResponseMetadata,
  widgetState = DEFAULT_STATE.widgetState,
  ...callbacks
}: OpenSkybridgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<SkybridgeConnection | null>(null);
  const callbacksRef = useRef<SkybridgeCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  // Store runtime in ref so we always use latest connect() even if object reference changes
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  // Memoize state object to avoid recreating on every render
  const state = useMemo<SkybridgeState>(
    () => ({
      theme,
      userAgent,
      locale,
      maxHeight,
      displayMode,
      safeArea,
      toolInput,
      toolOutput,
      toolResponseMetadata,
      widgetState,
    }),
    [
      theme,
      userAgent,
      locale,
      maxHeight,
      displayMode,
      safeArea,
      toolInput,
      toolOutput,
      toolResponseMetadata,
      widgetState,
    ],
  );

  // Render iframe and connect runtime
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let frame: RenderedFrame | null = null;
    let connection: SkybridgeConnection | null = null;

    const render = async () => {
      // Hash payload to create unique origin per payload (isolates cookie stores)
      const salt = await hashPayload(payload);

      const scf = new SafeContentFrame("openskybridge", {
        sandbox: ["allow-scripts"],
        salt,
      });

      // Inject runtime code into payload
      const currentRuntime = runtimeRef.current;
      const injectedPayload = injectRuntimeCode(payload, currentRuntime.runtimeCode);

      frame = await scf.renderHtml(injectedPayload, container);
      if (disposed) {
        frame.dispose();
        return;
      }

      // Create controller that wraps SafeContentFrame's postMessage
      const messageHandlers = new Set<(data: unknown) => void>();

      const controller: SkybridgeController = {
        postMessage(data) {
          frame?.sendMessage(data);
        },
        onMessage(handler) {
          messageHandlers.add(handler);
          return () => messageHandlers.delete(handler);
        },
      };

      // Listen for messages from iframe
      const handleWindowMessage = (event: MessageEvent) => {
        if (event.origin !== frame?.origin) return;
        messageHandlers.forEach((handler) => handler(event.data));
      };
      window.addEventListener("message", handleWindowMessage);

      // Connect runtime with callbacks that delegate to ref for stable references
      connection = currentRuntime.connect(controller, {
        onCallTool: (name, args) => {
          const fn = callbacksRef.current.onCallTool;
          return fn
            ? fn(name, args)
            : Promise.reject(new Error("onCallTool not provided"));
        },
        onRequestClose: () => callbacksRef.current.onRequestClose?.(),
        onSendFollowUpMessage: (args) => {
          const fn = callbacksRef.current.onSendFollowUpMessage;
          return fn
            ? fn(args)
            : Promise.reject(new Error("onSendFollowUpMessage not provided"));
        },
        onOpenExternal: (p) => callbacksRef.current.onOpenExternal?.(p),
        onRequestDisplayMode: (args) => {
          const fn = callbacksRef.current.onRequestDisplayMode;
          return fn
            ? fn(args)
            : Promise.reject(new Error("onRequestDisplayMode not provided"));
        },
        onSetWidgetState: (s) => {
          const fn = callbacksRef.current.onSetWidgetState;
          return fn
            ? fn(s)
            : Promise.reject(new Error("onSetWidgetState not provided"));
        },
      });
      connectionRef.current = connection;

      // Send initial state
      connection.updateState(state);

      // Cleanup handler for window message listener
      return () => {
        window.removeEventListener("message", handleWindowMessage);
      };
    };

    let cleanupMessageListener: (() => void) | undefined;
    render().then((cleanup) => {
      cleanupMessageListener = cleanup;
    });

    return () => {
      disposed = true;
      cleanupMessageListener?.();
      connection?.disconnect();
      connectionRef.current = null;
      frame?.dispose();
      container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runtimeRef used for latest runtime, state sent via separate effect
  }, [runtime.runtimeCode, payload]);

  // Send state updates when props change
  useEffect(() => {
    connectionRef.current?.updateState(state);
  }, [state]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
