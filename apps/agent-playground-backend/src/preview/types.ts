/**
 * Shared preview types — used by backend tools and frontend adapters.
 *
 * Two distinct flows:
 *   1. Example preview  — immutable hosted preview via show_ui_preview tool
 *   2. Workspace preview — live dev-server preview via resolve_workspace_preview tool
 */

// ---------------------------------------------------------------------------
// Workspace preview (live dev-server in local or sandbox workspace)
// ---------------------------------------------------------------------------

export type WorkspacePreviewSource = 'local' | 'sandbox';
export type WorkspacePreviewStatus = 'ready' | 'loading' | 'failed';

export interface ResolveWorkspacePreviewInput {
  /** Port the dev server is listening on inside the workspace. */
  port: number;
  /** Optional host override (default: localhost for local, ignored for sandbox). */
  host?: string;
}

export interface WorkspacePreviewResult {
  type: 'workspace_preview';
  status: WorkspacePreviewStatus;
  source: WorkspacePreviewSource;
  /** Reachable preview URL — present when status is 'ready'. */
  url?: string;
  port: number;
  host?: string;
  /** Sandbox provider name when source is 'sandbox'. */
  provider?: 'blaxel';
  /** Error message when status is 'failed'. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Example preview (immutable hosted preview)
// ---------------------------------------------------------------------------

export type ExamplePreviewStatus = 'ready' | 'missing';

export interface ExamplePreviewResult {
  type: 'show_ui_preview';
  recipeId: string;
  status: ExamplePreviewStatus;
  previewUrl?: string;
  screenshotUrl?: string;
  builtFromRef?: string;
  reason: string;
}
