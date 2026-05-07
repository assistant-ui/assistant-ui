export function normalizeToolName(toolName: string): string {
  return toolName
    .replace(/^workspace_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isFileEditTool(toolName: string): boolean {
  return ['write_file', 'edit_file', 'replace_file', 'apply_patch'].includes(toolName);
}

export function isShellTool(toolName: string): boolean {
  return ['shell', 'run_command', 'execute_command', 'bash'].includes(toolName);
}

export function summarizeToolResult(result: unknown): string {
  if (result == null) return '';
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}
