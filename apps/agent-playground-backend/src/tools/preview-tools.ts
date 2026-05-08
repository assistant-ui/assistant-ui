/**
 * Preview tools — workspace preview URL resolution.
 *
 * resolve_workspace_preview: Given a semantic target or port override, returns
 * the reachable preview URL for the current workspace.
 *
 * - Local workspaces → http://localhost:<port>
 * - Blaxel sandboxes → creates/fetches a Blaxel preview and returns the public URL
 *
 * This tool does NOT start dev servers — the agent is responsible for that.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { sessionWorkspaceRegistry } from "../workspace-provider.js";
import type {
  WorkspacePreviewResult,
  WorkspacePreviewTarget,
} from "../preview/types.js";

const BLAXEL_RESERVED_PREVIEW_PORTS = new Set([80, 443, 8080]);
const BLAXEL_DECLARED_PREVIEW_PORTS = new Set([3000, 4567]);
const DEFAULT_PREVIEW_TARGET: WorkspacePreviewTarget = "app";
const PREVIEW_TARGET_PORTS: Record<WorkspacePreviewTarget, number> = {
  app: 3000,
  "test-server": 4567,
};

function stringifyErrorObject(value: unknown): string {
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(
      value,
      (_key, nestedValue) => {
        if (typeof nestedValue === "object" && nestedValue !== null) {
          if (seen.has(nestedValue)) return "[Circular]";
          seen.add(nestedValue);
        }
        return nestedValue;
      },
      2,
    );
  } catch {
    if (value instanceof Error) return value.message || String(value);
    try { return `${Object.prototype.toString.call(value)}: ${Object.keys(value as object).join(', ')}`; } catch {}
    return String(value);
  }
}

function formatError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const candidate = err as {
      message?: unknown;
      error?: unknown;
      body?: unknown;
      response?: unknown;
      data?: unknown;
      status?: unknown;
      statusCode?: unknown;
      code?: unknown;
    };
    const details =
      candidate.message ??
      candidate.error ??
      candidate.body ??
      candidate.data ??
      candidate.response;
    const status = candidate.status ?? candidate.statusCode ?? candidate.code;
    const formatted = details
      ? stringifyErrorObject(details)
      : stringifyErrorObject(err);
    return status ? `HTTP ${status}: ${formatted}` : formatted;
  }
  return String(err);
}

function validateBlaxelPreviewPort(port: number): string | null {
  if (BLAXEL_RESERVED_PREVIEW_PORTS.has(port)) {
    return `Port ${port} cannot be exposed through a Blaxel preview because ports 80, 443, and 8080 are reserved by Blaxel. Restart the app on port 3000 using host 0.0.0.0, then call resolve_workspace_preview with {"target":"app"}.`;
  }

  if (!BLAXEL_DECLARED_PREVIEW_PORTS.has(port)) {
    return `Port ${port} is not declared on the assistant-ui Blaxel sandbox template. Declared preview ports are 3000 for app previews and 4567 for provider tests. Start the app on one of those ports using host 0.0.0.0 before calling resolve_workspace_preview.`;
  }

  return null;
}

function resolveTargetPort(
  target?: WorkspacePreviewTarget,
  port?: number,
): number {
  if (port) return port;
  return PREVIEW_TARGET_PORTS[target ?? DEFAULT_PREVIEW_TARGET];
}

/**
 * Look up the ProvisionedWorkspace for the current session.
 * Returns null if no session context or no workspace is provisioned.
 */
function getSessionWorkspace(context: any) {
  const trace = context?.requestContext?.get?.("augmentTrace") as
    | { sessionId?: string }
    | undefined;
  const sessionId = trace?.sessionId;
  if (!sessionId) return null;
  return sessionWorkspaceRegistry.get(sessionId) ?? null;
}

/**
 * Resolve a local workspace preview URL.
 */
function resolveLocalPreview(
  port: number,
  host?: string,
): WorkspacePreviewResult {
  const resolvedHost = host || "localhost";
  return {
    type: "workspace_preview",
    status: "ready",
    source: "local",
    url: `http://${resolvedHost}:${port}`,
    port,
    host: resolvedHost,
  };
}

/**
 * Resolve a Blaxel sandbox preview URL.
 * Creates the preview on-demand if it doesn't already exist.
 */
async function resolveBlaxelPreview(
  sandboxInstance: any,
  port: number,
): Promise<WorkspacePreviewResult> {
  const validationError = validateBlaxelPreviewPort(port);
  if (validationError) {
    return {
      type: "workspace_preview",
      status: "failed",
      source: "sandbox",
      port,
      provider: "blaxel",
      error: validationError,
    };
  }

  try {
    const previewName = `preview-port-${port}`;
    const preview = await sandboxInstance.previews.createIfNotExists({
      metadata: { name: previewName },
      spec: {
        port,
        public: true,
        ttl: "24h",
      },
    });

    const url = preview.spec?.url;
    if (!url) {
      return {
        type: "workspace_preview",
        status: "failed",
        source: "sandbox",
        port,
        provider: "blaxel",
        error: "Blaxel preview created but no URL was returned in spec.url",
      };
    }

    return {
      type: "workspace_preview",
      status: "ready",
      source: "sandbox",
      url,
      port,
      provider: "blaxel",
    };
  } catch (err: any) {
    return {
      type: "workspace_preview",
      status: "failed",
      source: "sandbox",
      port,
      provider: "blaxel",
      error: `Failed to create Blaxel preview: ${formatError(err)}`,
    };
  }
}

export const resolveWorkspacePreview = createTool({
  id: "resolve_workspace_preview",
  description:
    "Returns the reachable preview URL for a dev server running in the current workspace. " +
    "Call this only in the editable workspace flow. " +
    "Call this AFTER you have provisioned a workspace and started a dev server. " +
    "This tool does NOT start servers — it only resolves the URL the frontend can load in an iframe. " +
    'Prefer calling it with no input or with {"target":"app"}; the backend chooses the provider-specific app preview port. ' +
    "For local workspaces, returns http://localhost:<port>. " +
    "For Blaxel cloud sandboxes, the default app preview port is 3000 and dev servers must bind to 0.0.0.0. " +
    "The frontend will use the returned URL to display a live preview. " +
    "Do not call this for hosted example previews; use show_ui_preview for that path.",
  inputSchema: z.object({
    target: z
      .enum(["app", "test-server"])
      .optional()
      .describe(
        "Semantic preview target. Defaults to app. Use app for user-facing app previews and test-server for provider test servers.",
      ),
    port: z
      .number()
      .int()
      .min(1)
      .max(65535)
      .optional()
      .describe(
        "Advanced override. Usually omit this. For Blaxel sandboxes, assistant-ui exposes 3000 for app previews and 4567 for tests. Do not use 80, 443, or 8080.",
      ),
    host: z
      .string()
      .optional()
      .describe(
        "Advanced local-only host override. Defaults to localhost for local workspaces and is ignored for sandboxes.",
      ),
  }),
  execute: async (input, context) => {
    const provisioned = getSessionWorkspace(context);
    const port = resolveTargetPort(input.target, input.port);

    if (!provisioned) {
      return {
        type: "workspace_preview",
        status: "failed",
        source: "local",
        port,
        error:
          "No workspace is provisioned for this session. Call request_workspace first, then start your dev server.",
      } satisfies WorkspacePreviewResult;
    }

    // Route to the correct resolver based on provider kind
    if (provisioned.providerKind === "sandbox" && provisioned.sandboxInstance) {
      return resolveBlaxelPreview(provisioned.sandboxInstance, port);
    }

    // Default: local workspace
    return resolveLocalPreview(port, input.host);
  },
});

export const PREVIEW_TOOLS = {
  resolve_workspace_preview: resolveWorkspacePreview,
};
