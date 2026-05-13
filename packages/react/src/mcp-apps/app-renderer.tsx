"use client";

import { useEffect, useRef, useState } from "react";
import type { MCPAppMetadata } from "@assistant-ui/core";
import { MCPAppFrame } from "./app-frame";
import type { MCPAppRendererProps, MCPAppResource } from "./types";
import { getMCPAppFromToolPart } from "./utils";

type LoadedResourceState = {
  resourceUri: string;
  resource?: MCPAppResource;
  error?: Error;
};

function getInput(part: MCPAppRendererProps["part"]): unknown {
  if (
    part.status.type === "running" &&
    (part.argsText === "" || part.argsText === "{}")
  ) {
    return undefined;
  }
  return part.args;
}

export function MCPAppRenderer({
  part,
  sandbox,
  resource: resourceProp,
  loadResource,
  handlers,
  hostInfo,
  hostContext,
  fallback = null,
  loadingFallback,
  errorFallback,
}: MCPAppRendererProps) {
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
    if (
      appForRender == null ||
      resourceUri == null ||
      resourceProp != null ||
      loadResource == null
    ) {
      return;
    }

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
  }, [resourceUri, loadResource, resourceProp]);

  const loadedResourceForApp =
    loadedResource?.resourceUri === appForRender?.resourceUri
      ? loadedResource
      : undefined;
  const resource = resourceProp ?? loadedResourceForApp?.resource;
  const error = resourceProp == null ? loadedResourceForApp?.error : undefined;

  if (appForRender == null) {
    return <>{fallback}</>;
  }
  if (error != null) {
    if (errorFallback === undefined) return <>{fallback}</>;
    if (typeof errorFallback === "function") return <>{errorFallback(error)}</>;
    return <>{errorFallback}</>;
  }
  if (resource == null) {
    return <>{loadingFallback ?? fallback}</>;
  }

  return (
    <MCPAppFrame
      app={appForRender}
      resource={resource}
      input={getInput(part)}
      output={part.result}
      sandbox={sandbox}
      handlers={handlers}
      hostInfo={hostInfo}
      hostContext={hostContext}
    />
  );
}
