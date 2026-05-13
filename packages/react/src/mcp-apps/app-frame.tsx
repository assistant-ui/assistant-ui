"use client";

import { useEffect, useRef } from "react";
import { type RenderedFrame, SafeContentFrame } from "safe-content-frame";
import { type MCPAppBridge, createMCPAppBridge } from "./bridge";
import type { MCPAppFrameProps } from "./types";

const DEFAULT_PRODUCT = "assistant-ui-mcp-app";

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

  const liveRef = useRef({
    html: resource.html,
    sandbox,
    handlers,
    hostInfo,
    hostContext,
    input,
    output,
  });
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
        bridgeRef.current = createMCPAppBridge({
          frame: rendered,
          handlers: current.handlers,
          hostInfo: current.hostInfo,
          hostContext: current.hostContext,
        });

        if (current.input !== undefined) {
          bridgeRef.current.notifyToolInput(current.input);
          lastSentInputRef.current = current.input;
        }
        if (current.output !== undefined) {
          bridgeRef.current.notifyToolResult(current.output);
          lastSentOutputRef.current = current.output;
        }
        if (current.hostContext) {
          lastSentHostContextRef.current = current.hostContext;
        }
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
    };
  }, [resourceUri]);

  useEffect(() => {
    if (!bridgeRef.current) return;
    if (input === undefined) return;
    if (lastSentInputRef.current === input) return;
    bridgeRef.current.notifyToolInput(input);
    lastSentInputRef.current = input;
  }, [input]);

  useEffect(() => {
    if (!bridgeRef.current) return;
    if (output === undefined) return;
    if (lastSentOutputRef.current === output) return;
    bridgeRef.current.notifyToolResult(output);
    lastSentOutputRef.current = output;
  }, [output]);

  useEffect(() => {
    if (!bridgeRef.current) return;
    if (!hostContext) return;
    if (lastSentHostContextRef.current === hostContext) return;
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
