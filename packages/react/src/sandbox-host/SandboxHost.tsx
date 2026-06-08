"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  type RenderedFrame,
  SafeContentFrame,
  type SandboxOption,
} from "safe-content-frame";

const DEFAULT_PRODUCT = "assistant-ui-sandbox";
const DEFAULT_MAX_HEIGHT = 800;

export type SandboxHostConfig = {
  sandbox?: SandboxOption[];
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  salt?: string;
  product?: string;
  className?: string;
  style?: CSSProperties;
  unsafeDocumentWrite?: boolean;
};

export type SandboxHostFrame = Pick<
  RenderedFrame,
  "iframe" | "origin" | "sendMessage"
>;

export type SandboxHostApi = {
  setHeight: (height: number) => void;
};

export type SandboxBridge = {
  onMessage: (event: MessageEvent) => void;
  dispose: () => void;
};

export type SandboxContent = { html: string };

export type SandboxHostProps = {
  content: SandboxContent;
  contentKey: string;
  sandbox?: SandboxHostConfig | undefined;
  maxHeight?: number | undefined;
  createBridge: (
    frame: SandboxHostFrame,
    host: SandboxHostApi,
  ) => SandboxBridge;
  onError?: ((error: Error) => void) | undefined;
  containerProps?: Record<string, string | undefined> | undefined;
};

export function isSandboxFrameMessage(
  event: MessageEvent,
  frame: { iframe: HTMLIFrameElement; origin: string },
): boolean {
  return (
    event.source === frame.iframe.contentWindow && event.origin === frame.origin
  );
}

type LiveSnapshot = {
  content: SandboxContent;
  sandbox: SandboxHostConfig | undefined;
  createBridge: SandboxHostProps["createBridge"];
  onError: SandboxHostProps["onError"];
};

export function SandboxHost({
  content,
  contentKey,
  sandbox,
  maxHeight = DEFAULT_MAX_HEIGHT,
  createBridge,
  onError,
  containerProps,
}: SandboxHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined,
  );

  const liveRef = useRef<LiveSnapshot>(null!);
  liveRef.current = { content, sandbox, createBridge, onError };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let frame: RenderedFrame | null = null;
    let bridge: SandboxBridge | null = null;
    let onMessage: ((event: MessageEvent) => void) | null = null;

    const { content: liveContent, sandbox: sb } = liveRef.current;

    const scf = new SafeContentFrame(sb?.product ?? DEFAULT_PRODUCT, {
      ...(sb?.sandbox !== undefined && { sandbox: sb.sandbox }),
      ...(sb?.useShadowDom !== undefined && { useShadowDom: sb.useShadowDom }),
      ...(sb?.enableBrowserCaching !== undefined && {
        enableBrowserCaching: sb.enableBrowserCaching,
      }),
      ...(sb?.salt !== undefined && { salt: sb.salt }),
    });

    const renderOpts =
      sb?.unsafeDocumentWrite !== undefined
        ? { unsafeDocumentWrite: sb.unsafeDocumentWrite }
        : undefined;

    scf
      .renderHtml(liveContent.html, container, renderOpts)
      .then((rendered) => {
        if (cancelled) {
          rendered.dispose();
          return;
        }
        frame = rendered;

        const hostApi: SandboxHostApi = {
          setHeight: (height) => {
            if (
              typeof height === "number" &&
              Number.isFinite(height) &&
              height > 0
            ) {
              setContentHeight(height);
            }
          },
        };

        bridge = liveRef.current.createBridge(
          {
            iframe: rendered.iframe,
            origin: rendered.origin,
            sendMessage: rendered.sendMessage,
          },
          hostApi,
        );

        // Single owner of the window listener; the cross-origin guard runs
        // here so the bridge only sees frame-validated messages.
        onMessage = (event) => {
          if (!isSandboxFrameMessage(event, rendered)) return;
          bridge?.onMessage(event);
        };
        window.addEventListener("message", onMessage);
      })
      .catch((err) => {
        liveRef.current.onError?.(
          err instanceof Error ? err : new Error(String(err)),
        );
      });

    return () => {
      cancelled = true;
      if (onMessage) {
        window.removeEventListener("message", onMessage);
        onMessage = null;
      }
      bridge?.dispose();
      bridge = null;
      frame?.dispose();
      frame = null;
      setContentHeight(undefined);
    };
    // oxlint-disable-next-line react/exhaustive-deps -- re-init only on contentKey change; live values flow through liveRef
  }, [contentKey]);

  const resolvedHeight =
    contentHeight != null ? Math.min(contentHeight, maxHeight) : undefined;
  const mergedStyle =
    resolvedHeight != null
      ? { ...sandbox?.style, height: resolvedHeight }
      : sandbox?.style;

  return (
    <div
      {...containerProps}
      ref={containerRef}
      className={sandbox?.className}
      style={mergedStyle}
    />
  );
}
