"use client";

import { useEffect, useRef } from "react";
import { type RenderedFrame, SafeContentFrame } from "safe-content-frame";
import { type MCPAppBridge, createMCPAppBridge } from "./bridge";
import type {
  MCPAppBridgeHandlers,
  MCPAppFrameProps,
  MCPAppHostContext,
} from "./types";

const DEFAULT_PRODUCT = "assistant-ui-mcp-app";

type LiveSnapshot = {
  html: string;
  sandbox: MCPAppFrameProps["sandbox"];
  handlers: MCPAppBridgeHandlers | undefined;
  hostInfo: MCPAppFrameProps["hostInfo"];
  hostContext: MCPAppFrameProps["hostContext"];
  input: unknown;
  output: unknown;
};

// Proxy each per-call handler through liveRef so the bridge always dispatches
// to the latest handler reference (e.g. inline callbacks closing over state).
// Capability presence is snapshot at mount: a handler added later requires a
// remount (keyed on resource URI) to expose the capability to the widget.
function buildLiveHandlers(
  initial: MCPAppBridgeHandlers | undefined,
  liveRef: { readonly current: LiveSnapshot },
): MCPAppBridgeHandlers {
  const live = () => liveRef.current.handlers;
  const has = <K extends keyof MCPAppBridgeHandlers>(key: K) =>
    initial?.[key] !== undefined;
  const out: MCPAppBridgeHandlers = {};
  if (has("allowedTools")) {
    Object.defineProperty(out, "allowedTools", {
      get: () => live()?.allowedTools,
      enumerable: true,
      configurable: true,
    });
  }
  const liveCall = <K extends keyof MCPAppBridgeHandlers>(
    key: K,
  ): NonNullable<MCPAppBridgeHandlers[K]> =>
    ((p: unknown) => {
      const fn = live()?.[key] as ((p: unknown) => unknown) | undefined;
      if (!fn) {
        throw new Error(`${key} handler is no longer available`);
      }
      return fn(p);
    }) as NonNullable<MCPAppBridgeHandlers[K]>;
  if (has("callTool")) out.callTool = liveCall("callTool");
  if (has("readResource")) out.readResource = liveCall("readResource");
  if (has("listResources")) out.listResources = liveCall("listResources");
  if (has("openLink")) out.openLink = liveCall("openLink");
  if (has("sendMessage")) out.sendMessage = liveCall("sendMessage");
  if (has("updateModelContext"))
    out.updateModelContext = liveCall("updateModelContext");
  if (has("requestDisplayMode"))
    out.requestDisplayMode = liveCall("requestDisplayMode");
  out.onSizeChange = (p) => live()?.onSizeChange?.(p);
  out.onInitialized = () => live()?.onInitialized?.();
  out.onRequestTeardown = (p) => live()?.onRequestTeardown?.(p);
  out.onLog = (p) => live()?.onLog?.(p);
  out.onError = (e) => live()?.onError?.(e);
  return out;
}

export function MCPAppFrame({
  app,
  resource,
  input,
  output,
  sandbox,
  handlers,
  hostInfo,
  hostContext,
}: MCPAppFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<MCPAppBridge | null>(null);
  const frameRef = useRef<RenderedFrame | null>(null);
  const lastSentInputRef = useRef<unknown>(undefined);
  const lastSentOutputRef = useRef<unknown>(undefined);
  const lastSentHostContextRef = useRef<unknown>(undefined);
  // Per MCP Apps spec, the host should defer notifications until the widget
  // signals readiness via `notifications/initialized`. Until then, we record
  // pending values and flush them on init.
  const widgetReadyRef = useRef(false);
  const pendingInputRef = useRef<unknown>(undefined);
  const pendingOutputRef = useRef<unknown>(undefined);
  const pendingHostContextRef = useRef<unknown>(undefined);

  const liveRef = useRef<LiveSnapshot>(null!);
  liveRef.current = {
    html: resource.html,
    sandbox,
    handlers,
    hostInfo,
    hostContext,
    input,
    output,
  };

  const resourceUri = resource.uri;

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-mounts only on resource URI; live values flow through liveRef
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const live = liveRef.current;
    const sb = live.sandbox;

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
      .renderHtml(live.html, container, renderOpts)
      .then((rendered) => {
        if (cancelled) {
          rendered.dispose();
          return;
        }
        frameRef.current = rendered;
        const current = liveRef.current;
        const wrappedHandlers = buildLiveHandlers(current.handlers, liveRef);
        const userOnInitialized = wrappedHandlers.onInitialized;
        wrappedHandlers.onInitialized = () => {
          widgetReadyRef.current = true;
          const b = bridgeRef.current;
          if (b) {
            if (pendingInputRef.current !== undefined) {
              b.notifyToolInput(pendingInputRef.current);
              lastSentInputRef.current = pendingInputRef.current;
              pendingInputRef.current = undefined;
            }
            if (pendingOutputRef.current !== undefined) {
              b.notifyToolResult(pendingOutputRef.current);
              lastSentOutputRef.current = pendingOutputRef.current;
              pendingOutputRef.current = undefined;
            }
            if (pendingHostContextRef.current !== undefined) {
              b.notifyHostContextChanged(
                pendingHostContextRef.current as MCPAppHostContext,
              );
              lastSentHostContextRef.current = pendingHostContextRef.current;
              pendingHostContextRef.current = undefined;
            }
          }
          userOnInitialized?.();
        };
        bridgeRef.current = createMCPAppBridge({
          frame: rendered,
          handlers: wrappedHandlers,
          hostInfo: current.hostInfo,
          hostContext: current.hostContext,
        });

        if (current.input !== undefined)
          pendingInputRef.current = current.input;
        if (current.output !== undefined)
          pendingOutputRef.current = current.output;
        if (current.hostContext)
          pendingHostContextRef.current = current.hostContext;
      })
      .catch((err) => {
        liveRef.current.handlers?.onError?.(
          err instanceof Error ? err : new Error(String(err)),
        );
      });

    return () => {
      cancelled = true;
      bridgeRef.current?.dispose();
      bridgeRef.current = null;
      frameRef.current?.dispose();
      frameRef.current = null;
      lastSentInputRef.current = undefined;
      lastSentOutputRef.current = undefined;
      lastSentHostContextRef.current = undefined;
      widgetReadyRef.current = false;
      pendingInputRef.current = undefined;
      pendingOutputRef.current = undefined;
      pendingHostContextRef.current = undefined;
    };
  }, [resourceUri]);

  useEffect(() => {
    if (!bridgeRef.current) return;
    if (input === undefined) return;
    if (lastSentInputRef.current === input) return;
    if (!widgetReadyRef.current) {
      pendingInputRef.current = input;
      return;
    }
    bridgeRef.current.notifyToolInput(input);
    lastSentInputRef.current = input;
  }, [input]);

  useEffect(() => {
    if (!bridgeRef.current) return;
    if (output === undefined) return;
    if (lastSentOutputRef.current === output) return;
    if (!widgetReadyRef.current) {
      pendingOutputRef.current = output;
      return;
    }
    bridgeRef.current.notifyToolResult(output);
    lastSentOutputRef.current = output;
  }, [output]);

  useEffect(() => {
    if (!bridgeRef.current) return;
    if (!hostContext) return;
    if (lastSentHostContextRef.current === hostContext) return;
    if (!widgetReadyRef.current) {
      pendingHostContextRef.current = hostContext;
      return;
    }
    bridgeRef.current.notifyHostContextChanged(hostContext);
    lastSentHostContextRef.current = hostContext;
  }, [hostContext]);

  return (
    <div
      ref={containerRef}
      className={sandbox?.className}
      style={sandbox?.style}
      data-mcp-app-resource={app.resourceUri}
      data-mcp-app-prefers-border={
        resource.meta?.prefersBorder ? "" : undefined
      }
    />
  );
}
