import { useMemo, useRef } from "react";
import { resource } from "@assistant-ui/tap";
import type {
  McpAppResource,
  McpAppsHost,
  McpAppsRemoteHostOptions,
} from "./types";

const truncateBody = (body: string) =>
  body.length > 500 ? `${body.slice(0, 500)}...` : body;

const extractErrorBody = (body: string): string | undefined => {
  const trimmed = body.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (typeof record.message === "string") return record.message;
      if (typeof record.error === "string") return record.error;
      if (record.error && typeof record.error === "object") {
        const error = record.error as Record<string, unknown>;
        if (typeof error.message === "string") return error.message;
      }
    }
  } catch {
    return truncateBody(trimmed);
  }

  return truncateBody(trimmed);
};

const readErrorBody = async (res: Response): Promise<string | undefined> => {
  try {
    return extractErrorBody(await res.text());
  } catch {
    return undefined;
  }
};

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
    const status = res.statusText
      ? `${res.status} ${res.statusText}`
      : `${res.status}`;
    const body = await readErrorBody(res);
    throw new Error(
      `MCP App host request "${method}" to "${options.url}" failed with ${status}${body ? `: ${body}` : ""}`,
    );
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
const useMcpAppsRemoteHost = (
  options: McpAppsRemoteHostOptions,
): McpAppsHost => {
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
};

export const McpAppsRemoteHost = resource(useMcpAppsRemoteHost);
