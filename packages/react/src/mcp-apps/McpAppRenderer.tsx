"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { McpAppMetadata } from "@assistant-ui/core";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import { resource, tapConst, tapRef } from "@assistant-ui/tap";
import { McpAppFrame } from "./app-frame";
import type {
  McpAppBridgeHandlers,
  McpAppHostContext,
  McpAppHostInfo,
  McpAppResource,
  McpAppSandboxConfig,
} from "./types";
import { getMcpAppFromToolPart } from "./utils";

export type McpAppRendererOptions = {
  /** Fetch the HTML + meta for a `ui://` resource the server attached to a tool. */
  loadResource: (app: McpAppMetadata) => Promise<McpAppResource>;
  /** Bridge handlers — the widget calls these via JSON-RPC. All are optional. */
  handlers?: McpAppBridgeHandlers;
  /** Sandbox + container styling. Passes through to SafeContentFrame. */
  sandbox?: McpAppSandboxConfig;
  /** Identifies the host to the widget in the `ui/initialize` response. */
  hostInfo?: McpAppHostInfo;
  /** Delivered to the widget on initialize and pushed via `notifications/host_context/changed` on change. */
  hostContext?: McpAppHostContext;
  /** Rendered when no MCP app is on the part, or while load is in flight / failed (unless overridden). */
  fallback?: ReactNode;
  /** Rendered while `loadResource` is in flight. Defaults to `fallback`. */
  loadingFallback?: ReactNode;
  /** Rendered when `loadResource` rejects. Receives the error. Defaults to `fallback`. */
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

function InlineRenderer({
  part,
  optionsRef,
}: {
  part: ToolCallMessagePartProps;
  optionsRef: { readonly current: McpAppRendererOptions };
}) {
  const opts = optionsRef.current;
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
    const loadResource = optionsRef.current.loadResource;
    let cancelled = false;
    const targetUri = resourceUri;

    loadResource(appForRender)
      .then((res) => {
        if (!cancelled)
          setLoadedResource({ resourceUri: targetUri, resource: res });
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

  const loadedResourceForApp =
    loadedResource?.resourceUri === appForRender?.resourceUri
      ? loadedResource
      : undefined;
  const resource = loadedResourceForApp?.resource;
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
  if (resource == null) {
    return <>{opts.loadingFallback ?? fallback}</>;
  }

  return (
    <McpAppFrame
      app={appForRender}
      resource={resource}
      input={getInput(part)}
      output={part.result}
      sandbox={opts.sandbox}
      handlers={opts.handlers}
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
