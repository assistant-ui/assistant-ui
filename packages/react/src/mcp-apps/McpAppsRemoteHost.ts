import { resource, tapConst, tapRef } from "@assistant-ui/tap";
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

export const McpAppsRemoteHost = resource(
  (options: McpAppsRemoteHostOptions): McpAppsHost => {
    const optionsRef = tapRef(options);
    optionsRef.current = options;

    return tapConst(
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
  },
);
