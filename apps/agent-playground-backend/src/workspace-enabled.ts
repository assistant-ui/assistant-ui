/**
 * Workspace tools enabled predicate.
 *
 * Extracted from workspace.ts to break the circular dependency between
 * workspace.ts (which imports the session registry) and workspace-provider.ts
 * (which needs this function to configure Workspace tool visibility).
 */

import type { HarnessRequestContext } from '@mastra/core/harness';
import type { HarnessState } from './schema.js';

export function getHarnessStateFromToolContext(requestContext: Record<string, unknown>): HarnessState | undefined {
  const ctx = requestContext.harness as HarnessRequestContext<HarnessState> | undefined;
  return ctx?.getState?.() ?? ctx?.state;
}

/**
 * Dynamic enabled predicate passed to Workspace({ tools: { enabled } }).
 * Workspace tools are hidden until the harness state marks them as provisioned.
 */
export function workspaceToolsEnabled({ requestContext }: { requestContext: Record<string, unknown> }): boolean {
  const state = getHarnessStateFromToolContext(requestContext);

  if (!state) return true;
  if (state.workspacePolicy === 'none') return false;
  return state.workspaceProvisioned === true;
}
