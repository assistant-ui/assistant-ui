"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { MCPAppMetadata } from "@assistant-ui/core";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import { resource, tapConst, tapRef } from "@assistant-ui/tap";
import type { SandboxOption } from "safe-content-frame";
import { MCPAppFrame } from "./app-frame";
import type {
  MCPAppBridgeHandlers,
  MCPAppHostContext,
  MCPAppHostInfo,
  MCPAppResource,
  MCPAppSandboxConfig,
} from "./types";
import { getMCPAppFromToolPart } from "./utils";

type DisplayMode = "inline" | "fullscreen" | "pip";

export type MCPAppRendererOptions = {
  /** Fetch the HTML + meta for a `ui://` resource the server attached to a tool. */
  loadResource: (app: MCPAppMetadata) => Promise<MCPAppResource>;
  /** Bridge handlers — the widget calls these via JSON-RPC. All are optional. */
  handlers?: {
    /** Allowlist for `tools/call`. If set, calls to tool names not in the list are rejected with -32602. */
    allowedTools?: readonly string[];
    /** Widget called `tools/call`. */
    callTool?: (params: {
      name: string;
      arguments?: Record<string, unknown>;
    }) => Promise<unknown> | unknown;
    /** Widget called `resources/read`. */
    readResource?: (params: { uri: string }) => Promise<unknown> | unknown;
    /** Widget called `resources/list`. */
    listResources?: (params?: unknown) => Promise<unknown> | unknown;
    /** Widget called `openLink`. Bridge rejects non-http(s) URLs before this fires. */
    openLink?: (params: { url: string }) => Promise<unknown> | unknown;
    /** Widget called `sendMessage`. */
    sendMessage?: (params: unknown) => Promise<unknown> | unknown;
    /** Widget called `updateModelContext`. */
    updateModelContext?: (params: unknown) => Promise<unknown> | unknown;
    /** Widget called `requestDisplayMode`. Bridge validates the mode before this fires. */
    requestDisplayMode?: (params: {
      mode: DisplayMode;
    }) => Promise<{ mode: DisplayMode }> | { mode: DisplayMode };
    /** Widget posted `notifications/size_changed`. */
    onSizeChange?: (params: { width?: number; height?: number }) => void;
    /** Widget posted `notifications/initialized`. */
    onInitialized?: () => void;
    /** Widget posted `notifications/request_teardown`. */
    onRequestTeardown?: (params: unknown) => void;
    /** Widget posted `notifications/log`. */
    onLog?: (params: unknown) => void;
    /** Bridge-level errors and widget-posted `notifications/error`. */
    onError?: (error: Error) => void;
  };
  /** Sandbox + container styling. Passes through to SafeContentFrame. */
  sandbox?: {
    sandbox?: SandboxOption[];
    useShadowDom?: boolean;
    enableBrowserCaching?: boolean;
    salt?: string;
    product?: string;
    className?: string;
    style?: CSSProperties;
    unsafeDocumentWrite?: boolean;
  };
  /** Identifies the host to the widget in the `ui/initialize` response. */
  hostInfo?: {
    name: string;
    version: string;
  };
  /** Delivered to the widget on initialize and pushed via `notifications/host_context/changed` on change. */
  hostContext?: {
    theme?: "light" | "dark";
    displayMode?: DisplayMode;
    availableDisplayModes?: DisplayMode[];
    [key: string]: unknown;
  };
  /** Rendered when no MCP app is on the part, or while load is in flight / failed (unless overridden). */
  fallback?: ReactNode;
  /** Rendered while `loadResource` is in flight. Defaults to `fallback`. */
  loadingFallback?: ReactNode;
  /** Rendered when `loadResource` rejects. Receives the error. Defaults to `fallback`. */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
};

type LoadedResourceState = {
  resourceUri: string;
  resource?: MCPAppResource;
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
  optionsRef: { readonly current: MCPAppRendererOptions };
}) {
  const opts = optionsRef.current;
  const app = getMCPAppFromToolPart(part);
  const cachedAppRef = useRef<MCPAppMetadata | undefined>(undefined);
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
    <MCPAppFrame
      app={appForRender}
      resource={resource}
      input={getInput(part)}
      output={part.result}
      sandbox={opts.sandbox as MCPAppSandboxConfig | undefined}
      handlers={opts.handlers as MCPAppBridgeHandlers | undefined}
      hostInfo={opts.hostInfo as MCPAppHostInfo | undefined}
      hostContext={opts.hostContext as MCPAppHostContext | undefined}
    />
  );
}

export const MCPAppRenderer = resource(
  (
    options: MCPAppRendererOptions,
  ): { readonly render: ToolCallMessagePartComponent } => {
    const optionsRef = tapRef<MCPAppRendererOptions>(options);
    optionsRef.current = options;

    const render = tapConst((): ToolCallMessagePartComponent => {
      const Render: ToolCallMessagePartComponent = (props) => (
        <InlineRenderer part={props} optionsRef={optionsRef} />
      );
      Render.displayName = "MCPAppRenderer";
      return Render;
    }, []);

    return { render };
  },
);
