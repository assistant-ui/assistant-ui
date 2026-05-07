/**
 * Granular tool permission system.
 *
 * Tools are classified into categories by risk level.
 * Each category has a configurable policy: "allow", "ask", or "deny".
 * Session-scoped grants let the user approve a category once per session.
 *
 * Copied from mastracode — stripped LSP and AST tool references,
 * added request_workspace to always-allow set.
 */

import { MC_TOOLS } from './tool-names.js';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type ToolCategory = 'read' | 'edit' | 'execute' | 'mcp';

export const TOOL_CATEGORIES: Record<ToolCategory, { label: string; description: string }> = {
  read: { label: 'Read', description: 'Read files, search, list directories' },
  edit: { label: 'Edit', description: 'Create, modify, or delete files' },
  execute: { label: 'Execute', description: 'Run shell commands' },
  mcp: { label: 'MCP', description: 'External MCP server tools' },
};

// ---------------------------------------------------------------------------
// Tool → Category mapping
// ---------------------------------------------------------------------------

const TOOL_CATEGORY_MAP: Record<string, ToolCategory> = {
  // Read-only tools
  [MC_TOOLS.VIEW]: 'read',
  [MC_TOOLS.SEARCH_CONTENT]: 'read',
  [MC_TOOLS.FIND_FILES]: 'read',
  [MC_TOOLS.FILE_STAT]: 'read',
  web_search: 'read',
  'web-search': 'read',
  web_extract: 'read',
  'web-extract': 'read',

  // Edit tools
  [MC_TOOLS.STRING_REPLACE_LSP]: 'edit',
  [MC_TOOLS.WRITE_FILE]: 'edit',
  [MC_TOOLS.DELETE_FILE]: 'edit',
  [MC_TOOLS.MKDIR]: 'edit',
  subagent: 'edit',

  // Execute tools
  [MC_TOOLS.EXECUTE_COMMAND]: 'execute',
  [MC_TOOLS.GET_PROCESS_OUTPUT]: 'execute',
  [MC_TOOLS.KILL_PROCESS]: 'execute',
};

// Tools that never need approval regardless of policy
export const ALWAYS_ALLOW_TOOL_NAMES = [
  'ask_user',
  'task_write',
  'task_check',
  'submit_plan',
  'request_workspace',
] as const;

const ALWAYS_ALLOW_TOOLS = new Set<string>(ALWAYS_ALLOW_TOOL_NAMES);

/**
 * Get the category for a tool, or null if the tool is always-allowed.
 */
export function getToolCategory(toolName: string): ToolCategory | null {
  if (ALWAYS_ALLOW_TOOLS.has(toolName)) return null;
  return TOOL_CATEGORY_MAP[toolName] ?? 'mcp';
}

/**
 * Get the list of known tools for a given category.
 */
export function getToolsForCategory(category: ToolCategory): string[] {
  return Object.entries(TOOL_CATEGORY_MAP)
    .filter(([, cat]) => cat === category)
    .map(([tool]) => tool);
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export type PermissionPolicy = 'allow' | 'ask' | 'deny';

export interface PermissionRules {
  categories: Partial<Record<ToolCategory, PermissionPolicy>>;
  tools: Record<string, PermissionPolicy>;
}

export const DEFAULT_POLICIES: Record<ToolCategory, PermissionPolicy> = {
  read: 'allow',
  edit: 'ask',
  execute: 'ask',
  mcp: 'ask',
};

export const YOLO_POLICIES: Record<ToolCategory, PermissionPolicy> = {
  read: 'allow',
  edit: 'allow',
  execute: 'allow',
  mcp: 'allow',
};

export function createDefaultRules(): PermissionRules {
  return { categories: { ...DEFAULT_POLICIES }, tools: {} };
}

export function createHarnessInitialPermissionRules(): PermissionRules {
  return {
    categories: { ...DEFAULT_POLICIES },
    tools: Object.fromEntries(ALWAYS_ALLOW_TOOL_NAMES.map((toolName) => [toolName, 'allow'])) as Record<string, PermissionPolicy>,
  };
}

// ---------------------------------------------------------------------------
// Session grants
// ---------------------------------------------------------------------------

export class SessionGrants {
  private grantedCategories = new Set<ToolCategory>();
  private grantedTools = new Set<string>();

  allowCategory(category: ToolCategory): void { this.grantedCategories.add(category); }
  allowTool(toolName: string): void { this.grantedTools.add(toolName); }

  isGranted(toolName: string, category: ToolCategory): boolean {
    return this.grantedTools.has(toolName) || this.grantedCategories.has(category);
  }

  reset(): void { this.grantedCategories.clear(); this.grantedTools.clear(); }
  getGrantedCategories(): ToolCategory[] { return [...this.grantedCategories]; }
  getGrantedTools(): string[] { return [...this.grantedTools]; }
}

// ---------------------------------------------------------------------------
// Decision engine
// ---------------------------------------------------------------------------

export type ApprovalDecision = 'allow' | 'ask' | 'deny';

/**
 * Determine whether a tool call should be allowed, prompted, or denied.
 *
 * Priority:
 *  1. Always-allowed tools → allow
 *  2. Per-tool policy override → use that policy
 *  3. Session grants → allow
 *  4. Category policy → use that policy
 *  5. Fallback → DEFAULT_POLICIES[category] ?? "ask"
 */
export function resolveApproval(
  toolName: string,
  rules: PermissionRules,
  sessionGrants: SessionGrants,
): ApprovalDecision {
  const category = getToolCategory(toolName);
  if (category === null) return 'allow';
  const toolPolicy = rules.tools[toolName];
  if (toolPolicy) return toolPolicy;
  if (sessionGrants.isGranted(toolName, category)) return 'allow';
  const categoryPolicy = rules.categories[category];
  if (categoryPolicy) return categoryPolicy;
  return DEFAULT_POLICIES[category] ?? 'ask';
}
