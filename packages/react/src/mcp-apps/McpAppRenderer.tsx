"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { McpAppMetadata } from "@assistant-ui/core";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import {
  resource,
  tapConst,
  tapRef,
  tapResource,
  type ResourceElement,
} from "@assistant-ui/tap";
import { McpAppFrame } from "./app-frame";
import type {
  McpAppBridgeHandlers,
  McpAppHostContext,
  McpAppHostInfo,
  McpAppResource,
  McpAppSandboxConfig,
  McpAppsHost,
} from "./types";
import { getMcpAppFromToolPart } from "./utils";

export type McpAppRendererOptions = {
  /**
   * Provides the data-plane operations the widget can request
   * (`loadResource`, `callTool`, `readResource`, `listResources`). Use
   * `McpAppsRemoteHost({ url })` for the default HTTP-route convention.
   */
  host: ResourceElement<McpAppsHost>;
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

function InlineRenderer({
  part,
  internalsRef,
  optionsRef,
}: {
  part: ToolCallMessagePartProps;
  internalsRef: MutableRefObject<{ host: McpAppsHost }>;
  optionsRef: MutableRefObject<McpAppRendererOptions>;
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
    let cancelled = false;
    const targetUri = resourceUri;

    internalsRef.current.host
      .loadResource({ uri: targetUri })
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

  const bridgeHandlers = useMemo<McpAppBridgeHandlers>(
    () => ({
      openLink: defaultOpenLink,
      sendMessage: (params) => {
        const text = extractSendMessageText(params);
        if (!text) return { ok: false, reason: "unrecognised params shape" };
        aui.thread().append({ content: [{ type: "text", text }] });
        return { ok: true };
      },
      callTool: (params) => internalsRef.current.host.callTool(params),
      readResource: (params) => internalsRef.current.host.readResource(params),
      listResources: (params) =>
        internalsRef.current.host.listResources(params),
    }),
    [aui, internalsRef],
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
    const host = tapResource(options.host);

    const optionsRef = tapRef<McpAppRendererOptions>(options);
    optionsRef.current = options;

    const internalsRef = tapRef<{ host: McpAppsHost }>({ host });
    internalsRef.current = { host };

    const render = tapConst((): ToolCallMessagePartComponent => {
      const Render: ToolCallMessagePartComponent = (props) => (
        <InlineRenderer
          part={props}
          internalsRef={internalsRef}
          optionsRef={optionsRef}
        />
      );
      Render.displayName = "McpAppRenderer";
      return Render;
    }, []);

    return { render };
  },
);
