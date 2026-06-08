"use client";

import { type MutableRefObject, useEffect, useRef } from "react";
import { type McpAppBridge, createMcpAppBridge } from "./bridge";
import {
  SandboxHost,
  type SandboxBridge,
  type SandboxHostApi,
  type SandboxHostFrame,
} from "../sandbox-host/SandboxHost";
import type {
  McpAppBridgeHandlers,
  McpAppFrameProps,
  McpAppHostContext,
} from "./types";

const DEFAULT_PRODUCT = "assistant-ui-mcp-app";
const INIT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_HEIGHT = 800;

function useBridgeNotify<T>(
  value: T | undefined,
  bridgeRef: MutableRefObject<McpAppBridge | null>,
  widgetReadyRef: MutableRefObject<boolean>,
  pendingRef: MutableRefObject<T | undefined>,
  lastSentRef: MutableRefObject<T | undefined>,
  notify: (bridge: McpAppBridge, v: T) => void,
) {
  useEffect(() => {
    if (!bridgeRef.current) return;
    if (value === undefined) return;
    if (lastSentRef.current === value) return;
    if (!widgetReadyRef.current) {
      pendingRef.current = value;
      return;
    }
    notify(bridgeRef.current, value);
    lastSentRef.current = value;
    // oxlint-disable-next-line react/exhaustive-deps -- refs are stable; notify is assumed stable; re-run only when value changes
  }, [value]);
}

type LiveSnapshot = {
  handlers: McpAppBridgeHandlers | undefined;
  hostInfo: McpAppFrameProps["hostInfo"];
  hostContext: McpAppFrameProps["hostContext"];
  input: unknown;
  output: unknown;
};

// Proxy each per-call handler through liveRef so the bridge always dispatches
// to the latest handler reference (e.g. inline callbacks closing over state).
// Capability presence is snapshot at mount: a handler added later requires a
// remount (keyed on resource URI) to expose the capability to the widget.
function buildLiveHandlers(
  initial: McpAppBridgeHandlers | undefined,
  liveRef: { readonly current: LiveSnapshot },
): McpAppBridgeHandlers {
  const live = () => liveRef.current.handlers;
  const has = <K extends keyof McpAppBridgeHandlers>(key: K) =>
    initial?.[key] !== undefined;
  const out: McpAppBridgeHandlers = {};
  if (has("allowedTools")) {
    Object.defineProperty(out, "allowedTools", {
      get: () => live()?.allowedTools,
      enumerable: true,
      configurable: true,
    });
  }
  const liveCall = <K extends keyof McpAppBridgeHandlers>(
    key: K,
  ): NonNullable<McpAppBridgeHandlers[K]> =>
    ((p: unknown) => {
      const fn = live()?.[key] as ((p: unknown) => unknown) | undefined;
      if (!fn) {
        throw new Error(`${key} handler is no longer available`);
      }
      return fn(p);
    }) as NonNullable<McpAppBridgeHandlers[K]>;
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

export function McpAppFrame({
  app,
  resource,
  input,
  output,
  sandbox,
  handlers,
  hostInfo,
  hostContext,
  maxHeight = DEFAULT_MAX_HEIGHT,
}: McpAppFrameProps) {
  const bridgeRef = useRef<McpAppBridge | null>(null);
  const lastSentInputRef = useRef<unknown>(undefined);
  const lastSentOutputRef = useRef<unknown>(undefined);
  const lastSentHostContextRef = useRef<McpAppHostContext | undefined>(
    undefined,
  );
  // Per MCP Apps spec, the host should defer notifications until the widget
  // signals readiness via `notifications/initialized`. Until then, we record
  // pending values and flush them on init.
  const widgetReadyRef = useRef(false);
  const pendingInputRef = useRef<unknown>(undefined);
  const pendingOutputRef = useRef<unknown>(undefined);
  const pendingHostContextRef = useRef<McpAppHostContext | undefined>(
    undefined,
  );

  const liveRef = useRef<LiveSnapshot>(null!);
  liveRef.current = {
    handlers,
    hostInfo,
    hostContext,
    input,
    output,
  };

  const createBridge = (
    frame: SandboxHostFrame,
    host: SandboxHostApi,
  ): SandboxBridge => {
    const current = liveRef.current;
    let initTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const flushPending = () => {
      if (widgetReadyRef.current) return;
      widgetReadyRef.current = true;
      const b = bridgeRef.current;
      if (!b) return;
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
        b.notifyHostContextChanged(pendingHostContextRef.current);
        lastSentHostContextRef.current = pendingHostContextRef.current;
        pendingHostContextRef.current = undefined;
      }
    };

    const liveHandlers = buildLiveHandlers(current.handlers, liveRef);
    const liveOnInitialized = liveHandlers.onInitialized;
    const wrappedHandlers: McpAppBridgeHandlers = {
      ...liveHandlers,
      onInitialized: () => {
        if (initTimeoutId !== null) {
          clearTimeout(initTimeoutId);
          initTimeoutId = null;
        }
        flushPending();
        liveOnInitialized?.();
      },
      onSizeChange: (p) => {
        if (
          typeof p.height === "number" &&
          Number.isFinite(p.height) &&
          p.height > 0
        ) {
          host.setHeight(p.height);
        }
        liveHandlers.onSizeChange?.(p);
      },
    };

    // Safety net: if the widget never sends notifications/initialized (broken
    // or non-spec-compliant), flush the queue anyway so the host doesn't
    // appear hung.
    initTimeoutId = setTimeout(() => {
      initTimeoutId = null;
      flushPending();
    }, INIT_TIMEOUT_MS);

    const bridge = createMcpAppBridge({
      frame,
      handlers: wrappedHandlers,
      hostInfo: current.hostInfo,
      hostContext: current.hostContext,
    });
    bridgeRef.current = bridge;

    if (current.input !== undefined) pendingInputRef.current = current.input;
    if (current.output !== undefined) pendingOutputRef.current = current.output;
    // hostContext is delivered inside the ui/initialize response; subsequent
    // changes flow through useBridgeNotify's pending path.

    return {
      onMessage: bridge.onMessage,
      dispose: () => {
        if (initTimeoutId !== null) {
          clearTimeout(initTimeoutId);
          initTimeoutId = null;
        }
        bridge.dispose();
        bridgeRef.current = null;
        lastSentInputRef.current = undefined;
        lastSentOutputRef.current = undefined;
        lastSentHostContextRef.current = undefined;
        widgetReadyRef.current = false;
        pendingInputRef.current = undefined;
        pendingOutputRef.current = undefined;
        pendingHostContextRef.current = undefined;
      },
    };
  };

  useBridgeNotify(
    input,
    bridgeRef,
    widgetReadyRef,
    pendingInputRef,
    lastSentInputRef,
    (b, v) => b.notifyToolInput(v),
  );
  useBridgeNotify(
    output,
    bridgeRef,
    widgetReadyRef,
    pendingOutputRef,
    lastSentOutputRef,
    (b, v) => b.notifyToolResult(v),
  );
  useBridgeNotify(
    hostContext,
    bridgeRef,
    widgetReadyRef,
    pendingHostContextRef,
    lastSentHostContextRef,
    (b, v) => b.notifyHostContextChanged(v),
  );

  return (
    <SandboxHost
      content={{ html: resource.html }}
      contentKey={resource.uri}
      sandbox={{ ...sandbox, product: sandbox?.product ?? DEFAULT_PRODUCT }}
      maxHeight={maxHeight}
      createBridge={createBridge}
      onError={(err) => liveRef.current.handlers?.onError?.(err)}
      containerProps={{
        "data-mcp-app-resource": app.resourceUri,
        "data-mcp-app-prefers-border": resource.meta?.prefersBorder
          ? ""
          : undefined,
      }}
    />
  );
}
