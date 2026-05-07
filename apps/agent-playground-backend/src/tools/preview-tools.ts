/**
 * Preview tools — workspace preview URL resolution.
 *
 * resolve_workspace_preview: Given a port (chosen by the agent after starting
 * a dev server), returns the reachable preview URL for the current workspace.
 *
 * - Local workspaces → http://localhost:<port>
 * - Blaxel sandboxes → creates/fetches a Blaxel preview and returns the public URL
 *
 * This tool does NOT start dev servers — the agent is responsible for that.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { sessionWorkspaceRegistry } from '../workspace-provider.js';
import type { WorkspacePreviewResult } from '../preview/types.js';

/**
 * Look up the ProvisionedWorkspace for the current session.
 * Returns null if no session context or no workspace is provisioned.
 */
function getSessionWorkspace(context: any) {
  const trace = context?.requestContext?.get?.('augmentTrace') as
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
  const resolvedHost = host || 'localhost';
  return {
    type: 'workspace_preview',
    status: 'ready',
    source: 'local',
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
  try {
    const previewName = `preview-port-${port}`;
    const preview = await sandboxInstance.previews.createIfNotExists({
      metadata: { name: previewName },
      spec: {
        port,
        public: true,
        ttl: '24h',
      },
    });

    const url = preview.spec?.url;
    if (!url) {
      return {
        type: 'workspace_preview',
        status: 'failed',
        source: 'sandbox',
        port,
        provider: 'blaxel',
        error: 'Blaxel preview created but no URL was returned in spec.url',
      };
    }

    return {
      type: 'workspace_preview',
      status: 'ready',
      source: 'sandbox',
      url,
      port,
      provider: 'blaxel',
    };
  } catch (err: any) {
    return {
      type: 'workspace_preview',
      status: 'failed',
      source: 'sandbox',
      port,
      provider: 'blaxel',
      error: `Failed to create Blaxel preview: ${err?.message ?? String(err)}`,
    };
  }
}

export const resolveWorkspacePreview = createTool({
  id: 'resolve_workspace_preview',
  description:
    'Returns the reachable preview URL for a dev server running in the current workspace. ' +
    'Call this only in the editable workspace flow. ' +
    'Call this AFTER you have provisioned a workspace and started a dev server (e.g. npm run dev, next dev, vite dev) ' +
    'and know which port it is listening on. ' +
    'This tool does NOT start servers — it only resolves the URL the frontend can load in an iframe. ' +
    'For local workspaces, returns http://localhost:<port>. ' +
    'For cloud sandboxes, creates a public preview URL via the sandbox provider. ' +
    'The frontend will use the returned URL to display a live preview. ' +
    'Do not call this for hosted example previews; use show_ui_preview for that path.',
  inputSchema: z.object({
    port: z
      .number()
      .int()
      .min(1)
      .max(65535)
      .describe('Port number the dev server is listening on'),
    host: z
      .string()
      .optional()
      .describe(
        'Optional host override. Defaults to localhost for local workspaces. Ignored for sandboxes.',
      ),
  }),
  execute: async (input, context) => {
    const provisioned = getSessionWorkspace(context);

    if (!provisioned) {
      return {
        type: 'workspace_preview',
        status: 'failed',
        source: 'local',
        port: input.port,
        error:
          'No workspace is provisioned for this session. Call request_workspace first, then start your dev server.',
      } satisfies WorkspacePreviewResult;
    }

    // Route to the correct resolver based on provider kind
    if (provisioned.providerKind === 'sandbox' && provisioned.sandboxInstance) {
      return resolveBlaxelPreview(provisioned.sandboxInstance, input.port);
    }

    // Default: local workspace
    return resolveLocalPreview(input.port, input.host);
  },
});

export const PREVIEW_TOOLS = {
  resolve_workspace_preview: resolveWorkspacePreview,
};
