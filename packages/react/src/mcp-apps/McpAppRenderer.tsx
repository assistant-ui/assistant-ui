"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { McpAppMetadata } from "@assistant-ui/core";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { resource, tapConst, tapRef } from "@assistant-ui/tap";
import { McpAppFrame } from "./app-frame";
import type {
  McpAppBridgeHandlers,
  McpAppHostConfig,
  McpAppHostContext,
  McpAppHostInfo,
  McpAppResource,
  McpAppSandboxConfig,
} from "./types";
import { getMcpAppFromToolPart } from "./utils";

export type McpAppRendererOptions = {
  /**
   * Backend route that mediates MCP operations. The renderer auto-implements
   * `loadResource` and the data-side handlers (`callTool`, `readResource`,
   * `listResources`) by POSTing `{ method, params }` to `host.url`. See
   * {@link McpAppHostConfig} for the method contract.
   */
  host: McpAppHostConfig;
  /**
   * Client-side bridge handlers — for capabilities that must run in the
   * browser (DOM access, composer wiring, lifecycle events). Optional.
   * Data handlers (`callTool` / `readResource` / `listResources`) are
   * sourced from `host` and should not be set here.
   */
  handlers?: Omit<
    McpAppBridgeHandlers,
    "callTool" | "readResource" | "listResources"
  >;
  /** Sandbox + container styling. Passes through to SafeContentFrame. */
  sandbox?: McpAppSandboxConfig;
  /** Identifies the host to the widget in the `ui/initialize` response. */
  hostInfo?: McpAppHostInfo;
  /** Delivered to the widget on initialize and pushed via `notifications/host_context/changed` on change. */
  hostContext?: McpAppHostContext;
  /** Rendered when no MCP app is on the part, or while load is in flight / failed (unless overridden). */
  fallback?: ReactNode;
  /** Rendered while the resource is loading. Defaults to `fallback`. */
  loadingFallback?: ReactNode;
  /** Rendered when the resource load rejects. Defaults to `fallback`. */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
};

type LoadedResourceState = {
  resourceUri: string;
  resource?: McpAppResource;
  error?: Error;
};

function getInput(part: {
  status: { type: string };
  argsText: string;
  args: unknown;
}): unknown {
  if (
    part.status.type === "running" &&
    (part.argsText === "" || part.argsText === "{}")
  ) {
    return undefined;
  }
  return part.args;
}

async function postToHost(
  host: McpAppHostConfig,
  method: string,
  params: unknown,
): Promise<unknown> {
  const doFetch = host.fetch ?? fetch;
  const extraHeaders =
    typeof host.headers === "function"
      ? await host.headers()
      : (host.headers ?? {});
  const res = await doFetch(host.url, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify({ method, params }),
  });
  if (!res.ok) {
    throw new Error(`MCP App host request failed: ${res.status}`);
  }
  return res.json();
}

const defaultOpenLink = ({ url }: { url: string }) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

function extractSendMessageText(params: unknown): string | undefined {
  if (typeof params === "string") return params;
  if (!params || typeof params !== "object") return undefined;
  const obj = params as Record<string, unknown>;
  if (typeof obj["prompt"] === "string") return obj["prompt"];
  if (typeof obj["text"] === "string") return obj["text"];
  if (typeof obj["message"] === "string") return obj["message"];
  return undefined;
}

function buildBridgeHandlers(
  host: McpAppHostConfig,
  client: McpAppRendererOptions["handlers"] | undefined,
  defaults: { sendMessage: NonNullable<McpAppBridgeHandlers["sendMessage"]> },
): McpAppBridgeHandlers {
  return {
    openLink: defaultOpenLink,
    sendMessage: defaults.sendMessage,
    ...client,
    callTool: (params) => postToHost(host, "tools/call", params),
    readResource: (params) => postToHost(host, "resources/read", params),
    listResources: (params) => postToHost(host, "resources/list", params),
  };
}

function InlineRenderer({
  part,
  optionsRef,
}: {
  part: ToolCallMessagePartProps;
  optionsRef: { readonly current: McpAppRendererOptions };
}) {
  const opts = optionsRef.current;
  const aui = useAui();
  const app = getMcpAppFromToolPart(part);
  const cachedAppRef = useRef<McpAppMetadata | undefined>(undefined);
  if (app != null && cachedAppRef.current?.resourceUri !== app.resourceUri) {
    cachedAppRef.current = app;
  }
  const appForRender = app ?? cachedAppRef.current;

  const [loadedResource, setLoadedResource] = useState<LoadedResourceState>();

  const resourceUri = appForRender?.resourceUri;
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-fetches only when URI changes; mcp.app object identity is unstable across renders
  useEffect(() => {
    if (appForRender == null || resourceUri == null) return;
    const host = optionsRef.current.host;
    let cancelled = false;
    const targetUri = resourceUri;

    postToHost(host, "mcp-apps/read-resource", { uri: targetUri })
      .then((res) => {
        if (!cancelled)
          setLoadedResource({
            resourceUri: targetUri,
            resource: res as McpAppResource,
          });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadedResource({
            resourceUri: targetUri,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resourceUri]);

  const bridgeHandlers = useMemo(
    () =>
      buildBridgeHandlers(opts.host, opts.handlers, {
        sendMessage: (params) => {
          const text = extractSendMessageText(params);
          if (!text) return null;
          aui.thread().append({ content: [{ type: "text", text }] });
          return { ok: true };
        },
      }),
    [opts.host, opts.handlers, aui],
  );

  const loadedResourceForApp =
    loadedResource?.resourceUri === appForRender?.resourceUri
      ? loadedResource
      : undefined;
  const appResource = loadedResourceForApp?.resource;
  const error = loadedResourceForApp?.error;

  const fallback = opts.fallback ?? null;
  if (appForRender == null) {
    return <>{fallback}</>;
  }
  if (error != null) {
    const errorFallback = opts.errorFallback;
    if (errorFallback === undefined) return <>{fallback}</>;
    if (typeof errorFallback === "function") return <>{errorFallback(error)}</>;
    return <>{errorFallback}</>;
  }
  if (appResource == null) {
    return <>{opts.loadingFallback ?? fallback}</>;
  }

  return (
    <McpAppFrame
      app={appForRender}
      resource={appResource}
      input={getInput(part)}
      output={part.result}
      sandbox={opts.sandbox}
      handlers={bridgeHandlers}
      hostInfo={opts.hostInfo}
      hostContext={opts.hostContext}
    />
  );
}

export const McpAppRenderer = resource(
  (
    options: McpAppRendererOptions,
  ): { readonly render: ToolCallMessagePartComponent } => {
    const optionsRef = tapRef<McpAppRendererOptions>(options);
    optionsRef.current = options;

    const render = tapConst((): ToolCallMessagePartComponent => {
      const Render: ToolCallMessagePartComponent = (props) => (
        <InlineRenderer part={props} optionsRef={optionsRef} />
      );
      Render.displayName = "McpAppRenderer";
      return Render;
    }, []);

    return { render };
  },
);
