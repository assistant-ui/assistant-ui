/**
 * Tool name constants.
 *
 * These are the names exposed to the LLM via workspace tool name remapping.
 * Used throughout for permissions, prompts, tool guidance, subagent allowed tools.
 * Adapted from mastracode — stripped LSP and AST tool mappings.
 */

import { WORKSPACE_TOOLS } from "@mastra/core/workspace";

export const MC_TOOLS = {
  // Filesystem
  VIEW: "view",
  WRITE_FILE: "write_file",
  STRING_REPLACE_LSP: "string_replace_lsp",
  FIND_FILES: "find_files",
  DELETE_FILE: "delete_file",
  FILE_STAT: "file_stat",
  MKDIR: "mkdir",

  // Search
  SEARCH_CONTENT: "search_content",

  // Sandbox
  EXECUTE_COMMAND: "execute_command",
  GET_PROCESS_OUTPUT: "get_process_output",
  KILL_PROCESS: "kill_process",
} as const;

/**
 * Workspace tool name remapping config.
 * Maps core workspace tool constants to our tool names.
 * Pass this into `Workspace({ tools: ... })`.
 */
export const TOOL_NAME_OVERRIDES = {
  [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: { name: MC_TOOLS.VIEW },
  [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { name: MC_TOOLS.WRITE_FILE },
  [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: { name: MC_TOOLS.STRING_REPLACE_LSP },
  [WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: { name: MC_TOOLS.FIND_FILES },
  [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { name: MC_TOOLS.DELETE_FILE },
  [WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT]: { name: MC_TOOLS.FILE_STAT },
  [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: { name: MC_TOOLS.MKDIR },
  [WORKSPACE_TOOLS.FILESYSTEM.GREP]: { name: MC_TOOLS.SEARCH_CONTENT },
  [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: { name: MC_TOOLS.EXECUTE_COMMAND },
  [WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT]: {
    name: MC_TOOLS.GET_PROCESS_OUTPUT,
  },
  [WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS]: { name: MC_TOOLS.KILL_PROCESS },
} as const;
