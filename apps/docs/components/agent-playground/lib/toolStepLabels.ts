export const TOOL_STEP_LABELS: Record<string, string> = {
  list_examples: "Browsing templates",
  get_example: "Reading template",
  show_ui_preview: "Preparing preview",
  request_workspace: "Setting up workspace",
  resolve_workspace_preview: "Starting preview",
  view: "Reading files",
  find_files: "Finding files",
  search_content: "Searching codebase",
  string_replace_lsp: "Editing file",
  execute_command: "Running command",
  ask_user: "Asking a question",
  task_write: "Updating task list",
  subagent: "Delegating task",
};

export function toolStepLabel(toolName: string): string {
  return TOOL_STEP_LABELS[toolName] ?? toolName;
}
