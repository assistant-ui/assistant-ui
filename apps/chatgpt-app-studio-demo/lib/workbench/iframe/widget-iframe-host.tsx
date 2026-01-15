"use client";

import {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  type CSSProperties,
} from "react";
import { useWorkbenchStore } from "../store";
import {
  WorkbenchMessageBridge,
  type WorkbenchMessageHandlers,
} from "./workbench-message-bridge";
import {
  generateIframeHtml,
  generateEmptyIframeHtml,
} from "./generate-iframe-html";
import type {
  OpenAIGlobals,
  CallToolResponse,
  DisplayMode,
  ModalOptions,
  WidgetState,
} from "../types";
import { handleMockToolCall } from "../mock-responses";
import { storeFile, getFileUrl } from "../file-store";
import { MORPH_TIMING } from "../transition-config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export interface WidgetIframeHostProps {
  widgetBundle: string | null;
  cssBundle?: string;
  className?: string;
  style?: CSSProperties;
}

export function WidgetIframeHost({
  widgetBundle,
  cssBundle,
  className,
  style,
}: WidgetIframeHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<WorkbenchMessageBridge | null>(null);
  const store = useWorkbenchStore();
  const reducedMotion = useReducedMotion();
  const [iframeKey, setIframeKey] = useState(0);

  const globals = useMemo<OpenAIGlobals>(
    () => store.getOpenAIGlobals(),
    [store],
  );

  const handleCallTool = useCallback(
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
          delay: 300,
          startTime: Date.now(),
        });

        if (simConfig.responseMode === "hang") {
          store.addConsoleEntry({
            type: "callTool",
            method: `callTool("${name}") → [SIMULATED: hang]`,
            result: {
              _note: "Response withheld to test loading state (30s timeout)",
            },
          });

          const HANG_TIMEOUT_MS = 30000;

          return new Promise<CallToolResponse>((_resolve, reject) => {
            let cancelled = false;

            const timeoutId = setTimeout(() => {
              if (cancelled) return;
              store.setActiveToolCall(null);
              store.addConsoleEntry({
                type: "callTool",
                method: `callTool("${name}") → [SIMULATED: hang timeout]`,
                result: { _note: "Hang simulation timed out after 30 seconds" },
              });
              reject(new Error("Simulated hang timed out after 30 seconds"));
            }, HANG_TIMEOUT_MS);

            const cancelFn = () => {
              cancelled = true;
              clearTimeout(timeoutId);
              store.addConsoleEntry({
                type: "callTool",
                method: `callTool("${name}") → [SIMULATED: hang cancelled]`,
                result: { _note: "Hang simulation cancelled by user" },
              });
              reject(new Error("Hang simulation cancelled"));
            };

            store.setActiveToolCall({
              toolName: name,
              delay: HANG_TIMEOUT_MS,
              startTime: Date.now(),
              isHanging: true,
              cancelFn,
            });
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
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
      const delay = activeVariant?.delay ?? 300;

      store.setActiveToolCall({
        toolName: name,
        delay,
        startTime: Date.now(),
      });

      let result;
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

  const handleSetWidgetState = useCallback(
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

  const handleRequestDisplayMode = useCallback(
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

  const handleSendFollowUpMessage = useCallback(
    async (args: { prompt: string }): Promise<void> => {
      store.addConsoleEntry({
        type: "sendFollowUpMessage",
        method: "sendFollowUpMessage",
        args,
      });
    },
    [store],
  );

  const handleRequestClose = useCallback(() => {
    store.addConsoleEntry({
      type: "requestClose",
      method: "requestClose",
    });
    store.setWidgetClosed(true);
  }, [store]);

  const handleOpenExternal = useCallback(
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

  const handleNotifyIntrinsicHeight = useCallback(
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

  const handleRequestModal = useCallback(
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

  const handleUploadFile = useCallback(
    async (file: File) => {
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

  const handleGetFileDownloadUrl = useCallback(
    async (args: { fileId: string }) => {
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

  const handlers = useMemo<WorkbenchMessageHandlers>(
    () => ({
      callTool: handleCallTool,
      setWidgetState: handleSetWidgetState,
      requestDisplayMode: handleRequestDisplayMode,
      sendFollowUpMessage: handleSendFollowUpMessage,
      requestClose: handleRequestClose,
      openExternal: handleOpenExternal,
      notifyIntrinsicHeight: handleNotifyIntrinsicHeight,
      requestModal: handleRequestModal,
      uploadFile: handleUploadFile,
      getFileDownloadUrl: handleGetFileDownloadUrl,
    }),
    [
      handleCallTool,
      handleSetWidgetState,
      handleRequestDisplayMode,
      handleSendFollowUpMessage,
      handleRequestClose,
      handleOpenExternal,
      handleNotifyIntrinsicHeight,
      handleRequestModal,
      handleUploadFile,
      handleGetFileDownloadUrl,
    ],
  );

  const srcdoc = useMemo(() => {
    if (!widgetBundle) {
      return generateEmptyIframeHtml(globals);
    }
    return generateIframeHtml({
      widgetBundle,
      cssBundle,
      initialGlobals: globals,
      useTailwindCdn: true,
    });
  }, [widgetBundle, cssBundle, globals]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const bridge = new WorkbenchMessageBridge(handlers);
    bridgeRef.current = bridge;

    function handleLoad() {
      const currentIframe = iframeRef.current;
      if (!currentIframe) return;
      bridge.attach(currentIframe);
      bridge.sendGlobals(globals);
    }

    iframe.addEventListener("load", handleLoad);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      bridge.detach();
      bridgeRef.current = null;
    };
  }, [handlers, globals, iframeKey]);

  useEffect(() => {
    if (bridgeRef.current) {
      bridgeRef.current.sendGlobals(globals);
    }
  }, [globals]);

  useEffect(() => {
    setIframeKey((k) => k + 1);
  }, [widgetBundle, cssBundle]);

  return (
    <iframe
      key={iframeKey}
      ref={iframeRef}
      srcDoc={srcdoc}
      className={className}
      style={{
        border: "none",
        width: "100%",
        height: "100%",
        ...style,
      }}
      sandbox="allow-scripts allow-same-origin"
      title="Widget Preview"
    />
  );
}
