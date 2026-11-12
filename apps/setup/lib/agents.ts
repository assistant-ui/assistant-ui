/** Display names for the coding agent kinds the CLI reports. */
const AGENT_NAMES: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  copilot: "Copilot CLI",
  amp: "Amp",
  qwen: "Qwen Code",
  augment: "Augment",
  droid: "Factory Droid",
  kiro: "Kiro",
  goose: "Goose",
  junie: "Junie",
  cline: "Cline",
  crush: "Crush",
  aider: "Aider",
  warp: "Warp",
  windsurf: "Windsurf",
  roo: "Roo Code",
  zed: "Zed",
};

/** The display name for an agent kind the CLI reported, or `undefined` for one it has no name for. */
export const agentKindName = (kind: string | null | undefined) =>
  kind == null ? undefined : AGENT_NAMES[kind];
