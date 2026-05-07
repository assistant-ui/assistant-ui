/**
 * request_workspace tool - lazy workspace provisioning.
 *
 * The agent calls this when it determines it needs file/shell access.
 * This provisions and registers a real workspace, then flips
 * state.workspaceProvisioned so getDynamicWorkspace returns it on the next
 * tool resolution cycle.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { HarnessRequestContext } from '@mastra/core/harness';
import type { HarnessState } from '../schema.js';
import { provisionWorkspace, sessionWorkspaceRegistry } from '../workspace-provider.js';

export const requestWorkspaceTool = createTool({
  id: 'request_workspace',
  description:
    'Request workspace access for file operations and shell commands. This is the entry point for editable flows. Call it when the user asks you to read, write, edit, search, scaffold, verify, or run code. This only grants access to the workspace. It does not mean an app is already scaffolded. Do NOT call it for preview-only example browsing or general knowledge questions.',
  inputSchema: z.object({
    reason: z
      .string()
      .describe('Brief reason why workspace access is needed'),
  }),
  execute: async (_input, context) => {
    const harnessCtx = context?.requestContext?.get?.('harness') as
      | HarnessRequestContext<HarnessState>
      | undefined;

    if (!harnessCtx) {
      return {
        status: 'error' as const,
        message: 'Cannot access harness context. Workspace cannot be provisioned.',
      };
    }

    const state = harnessCtx.getState();
    const sessionId = state?.sessionId;
    if (!sessionId) {
      return {
        status: 'error' as const,
        message: 'Cannot resolve session id. Workspace cannot be provisioned.',
      };
    }

    const existingWorkspace = sessionWorkspaceRegistry.get(sessionId);
    if (state?.workspaceProvisioned && existingWorkspace) {
      return {
        status: 'already_provisioned' as const,
        message:
          'Workspace access is already available. ' +
          'The workspace may still be empty until you explicitly materialize or create files in it. ' +
          'If you are using an example as a starting point, scaffold the selected example or template into the workspace before trying to verify or start the app.',
        workspacePath: existingWorkspace.workspacePath ?? state?.workspacePath ?? state?.projectPath ?? process.cwd(),
      };
    }

    const provisioned = await provisionWorkspace({
      sessionId,
      workspaceProvider: 'sandbox',
      sandboxProvider: 'blaxel',
      cleanupOnDestroy: true,
    });
    const workspacePath = provisioned.workspacePath ?? state?.projectPath ?? process.cwd();

    await harnessCtx.setState({
      workspaceProvisioned: true,
      workspaceProvider: 'sandbox',
      workspacePath,
      workspaceProvisionMode: 'empty',
      sandboxProvider: 'blaxel',
    });

    return {
      status: 'provisioned' as const,
      message:
        'Workspace access granted. File and shell tools are now available. ' +
        'Important: the app root may still be empty. ' +
        'If you are starting from an example, scaffold the selected example or template into this workspace before verifying, editing, or starting the app.',
      workspacePath,
    };
  },
});
