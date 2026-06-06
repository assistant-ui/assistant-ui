import { useMemo, useRef } from "react";
import { resource } from "@assistant-ui/tap";
import type {
  McpAppResource,
  McpAppsHost,
  McpAppsRemoteHostOptions,
} from "./types";

async function postToHost(
  options: McpAppsRemoteHostOptions,
  method: string,
  params: unknown,
): Promise<unknown> {
  const doFetch = options.fetch ?? fetch;
  const extraHeaders =
    typeof options.headers === "function"
      ? await options.headers()
      : (options.headers ?? {});
  const res = await doFetch(options.url, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify({ method, params }),
  });
  if (!res.ok) {
    throw new Error(`MCP App host request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Creates the default HTTP host for MCP App widgets.
 *
 * The host POSTs widget requests to the configured route as `{ method,
 * params }`, using the method names expected by the assistant-ui MCP Apps
 * guide.
 */
export const McpAppsRemoteHost = resource(function McpAppsRemoteHost(
  options: McpAppsRemoteHostOptions,
): McpAppsHost {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  return useMemo(
    (): McpAppsHost => ({
      loadResource: (params) =>
        postToHost(
          optionsRef.current,
          "mcp-apps/read-resource",
          params,
        ) as Promise<McpAppResource>,
      callTool: (params) =>
        postToHost(optionsRef.current, "tools/call", params),
      readResource: (params) =>
        postToHost(optionsRef.current, "resources/read", params),
      listResources: (params) =>
        postToHost(optionsRef.current, "resources/list", params),
    }),
    [],
  );
});
