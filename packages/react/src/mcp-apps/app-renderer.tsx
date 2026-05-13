"use client";

import { useEffect, useState } from "react";
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
  return part.status?.type === "running" &&
    Object.keys(part.args ?? {}).length === 0
    ? undefined
    : part.args;
}

function getOutput(part: MCPAppRendererProps["part"]): unknown {
  return part.result;
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
}: MCPAppRendererProps) {
  const app = getMCPAppFromToolPart(part);
  const [cachedApp, setCachedApp] = useState<MCPAppMetadata>();
  const [loadedResource, setLoadedResource] = useState<LoadedResourceState>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: cache key is resourceUri; functional update reads latest app
  useEffect(() => {
    if (app != null) {
      setCachedApp((previous) =>
        previous?.resourceUri === app.resourceUri ? previous : app,
      );
    }
  }, [app?.resourceUri]);

  const appForRender = app ?? cachedApp;

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

  if (appForRender == null || error != null || resource == null) {
    return <>{fallback}</>;
  }

  return (
    <MCPAppFrame
      app={appForRender}
      resource={resource}
      input={getInput(part)}
      output={getOutput(part)}
      sandbox={sandbox}
      handlers={handlers}
      hostInfo={hostInfo}
      hostContext={hostContext}
    />
  );
}
