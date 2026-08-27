import { useEffect, useMemo, useRef } from "react";
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

const invalidMcpAppResource = (options: McpAppsRemoteHostOptions): never => {
  throw new Error(
    `Invalid MCP App host response "mcp-apps/read-resource" from "${options.url}": expected a resource with non-empty string "uri" and "html" fields`,
  );
};

const parseMcpAppResource = (
  value: unknown,
  options: McpAppsRemoteHostOptions,
): McpAppResource => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidMcpAppResource(options);
  }

  const resource = value as Record<string, unknown>;
  if (
    typeof resource.uri !== "string" ||
    resource.uri.trim() === "" ||
    typeof resource.html !== "string" ||
    resource.html.trim() === ""
  ) {
    return invalidMcpAppResource(options);
  }

  return value as McpAppResource;
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
  try {
    return await res.json();
  } catch (cause) {
    throw new Error(
      `Invalid MCP App host response "${method}" from "${options.url}": expected valid JSON`,
      { cause },
    );
  }
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
  useEffect(() => {
    optionsRef.current = options;
  });

  const url = options.url;

  const hostState = useMemo(() => {
    let pendingOptions = options;
    const getCurrentOptions = () =>
      optionsRef.current.url === url ? optionsRef.current : pendingOptions;
    const host: McpAppsHost = {
      loadResource: async (params) => {
        const options = getCurrentOptions();
        return parseMcpAppResource(
          await postToHost(options, "mcp-apps/read-resource", params),
          options,
        );
      },
      callTool: (params) =>
        postToHost(getCurrentOptions(), "tools/call", params),
      readResource: (params) =>
        postToHost(getCurrentOptions(), "resources/read", params),
      listResources: (params) =>
        postToHost(getCurrentOptions(), "resources/list", params),
    };
    return {
      host,
      updatePendingOptions: (next: McpAppsRemoteHostOptions) => {
        pendingOptions = next;
      },
    };
    // oxlint-disable-next-line react/exhaustive-deps -- URL changes replace the host identity; pending and same-URL options are refreshed outside the memo
  }, [url]);

  // The pending snapshot is read only while the committed ref still lags this
  // host's URL, and every write to it carries that same render's options, so
  // no render can pair one URL with another's credentials. A committed host can
  // be written here (a child layout effect re-rendering synchronously runs
  // before passive effects publish the ref), which stays coherent for the same
  // reason.
  if (optionsRef.current.url !== url) {
    hostState.updatePendingOptions(options);
  }

  return hostState.host;
};

export const McpAppsRemoteHost = resource(useMcpAppsRemoteHost);
