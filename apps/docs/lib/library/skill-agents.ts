export type SkillAgent = {
  name: string;
  /** What the skills CLI calls the agent, for its `-a` flag. */
  slug: string;
  /** Where the CLI puts the skills for this agent. */
  directory: string;
};

// Copied from the library app (apps/library/lib/library/items.ts), which
// follows the agents table in the skills CLI's docs.
const AGENTS: readonly (readonly [
  name: string,
  slug: string,
  directory: string,
])[] = [
  ["AdaL", "adal", ".adal/skills"],
  ["AiderDesk", "aider-desk", ".aider-desk/skills"],
  ["Amp", "amp", ".agents/skills"],
  ["Antigravity", "antigravity", ".agents/skills"],
  ["Antigravity CLI", "antigravity-cli", ".agents/skills"],
  ["AstrBot", "astrbot", "data/skills"],
  ["Augment", "augment", ".augment/skills"],
  ["Autohand Code CLI", "autohand-code", ".autohand/skills"],
  ["Claude Code", "claude-code", ".claude/skills"],
  ["Cline", "cline", ".agents/skills"],
  ["Code Studio", "codestudio", ".codestudio/skills"],
  ["CodeArts Agent", "codearts-agent", ".codeartsdoer/skills"],
  ["CodeBuddy", "codebuddy", ".codebuddy/skills"],
  ["Codemaker", "codemaker", ".codemaker/skills"],
  ["Codex", "codex", ".agents/skills"],
  ["Command Code", "command-code", ".commandcode/skills"],
  ["Continue", "continue", ".continue/skills"],
  ["Cortex Code", "cortex", ".cortex/skills"],
  ["Crush", "crush", ".crush/skills"],
  ["Cursor", "cursor", ".agents/skills"],
  ["Deep Agents", "deepagents", ".agents/skills"],
  ["Devin for Terminal", "devin", ".devin/skills"],
  ["Dexto", "dexto", ".agents/skills"],
  ["Droid", "droid", ".agents/skills"],
  ["Eve", "eve", "agent/skills"],
  ["Firebender", "firebender", ".agents/skills"],
  ["ForgeCode", "forgecode", ".forge/skills"],
  ["fx", "fx", ".agents/skills"],
  ["Gemini CLI", "gemini-cli", ".agents/skills"],
  ["GitHub Copilot", "github-copilot", ".agents/skills"],
  ["Goose", "goose", ".goose/skills"],
  ["Grok Build", "grok", ".grok/skills"],
  ["Hermes Agent", "hermes-agent", ".hermes/skills"],
  ["IBM Bob", "bob", ".bob/skills"],
  ["iFlow CLI", "iflow-cli", ".iflow/skills"],
  ["inference.sh", "inference-sh", ".inferencesh/skills"],
  ["Jazz", "jazz", ".jazz/skills"],
  ["Junie", "junie", ".junie/skills"],
  ["Kilo Code", "kilo", ".agents/skills"],
  ["Kimchi", "kimchi", ".kimchi/skills"],
  ["Kimi Code CLI", "kimi-code-cli", ".agents/skills"],
  ["Kiro CLI", "kiro-cli", ".kiro/skills"],
  ["Kode", "kode", ".kode/skills"],
  ["Lingma", "lingma", ".lingma/skills"],
  ["Loaf", "loaf", ".agents/skills"],
  ["MCPJam", "mcpjam", ".mcpjam/skills"],
  ["MiniMax Code", "minimax-code", ".minimax/skills"],
  ["Mistral Vibe", "mistral-vibe", ".vibe/skills"],
  ["Moxby", "moxby", ".moxby/skills"],
  ["Mux", "mux", ".mux/skills"],
  ["Neovate", "neovate", ".neovate/skills"],
  ["Ona", "ona", ".ona/skills"],
  ["OpenClaw", "openclaw", "skills"],
  ["OpenCode", "opencode", ".agents/skills"],
  ["OpenHands", "openhands", ".openhands/skills"],
  ["Pi", "pi", ".agents/skills"],
  ["Pochi", "pochi", ".pochi/skills"],
  ["Posit Assistant", "posit-assistant", ".posit/assistant/skills"],
  ["PromptScript", "promptscript", ".agents/skills"],
  ["Qoder", "qoder", ".qoder/skills"],
  ["Qoder CN", "qoder-cn", ".qoder/skills"],
  ["Qwen Code", "qwen-code", ".qwen/skills"],
  ["Reasonix", "reasonix", ".reasonix/skills"],
  ["Replit", "replit", ".agents/skills"],
  ["Roo Code", "roo", ".roo/skills"],
  ["Rovo Dev", "rovodev", ".rovodev/skills"],
  ["Sarvam Code", "sarvam-code", ".agents/skills"],
  ["Tabnine CLI", "tabnine-cli", ".tabnine/agent/skills"],
  ["Terramind", "terramind", ".terramind/skills"],
  ["Tinycloud", "tinycloud", ".tinycloud/skills"],
  ["Trae", "trae", ".trae/skills"],
  ["Trae CN", "trae-cn", ".trae/skills"],
  ["Universal", "universal", ".agents/skills"],
  ["Warp", "warp", ".agents/skills"],
  ["Windsurf", "windsurf", ".windsurf/skills"],
  ["ZCode", "zcode", ".zcode/skills"],
  ["Zed", "zed", ".agents/skills"],
  ["Zencoder", "zencoder", ".zencoder/skills"],
  ["Zenflow", "zenflow", ".zencoder/skills"],
];

/** The agents people ask for most, in the order skills.sh shows them; the rest follow by name. */
const FIRST = [
  "claude-code",
  "cursor",
  "codex",
  "github-copilot",
  "windsurf",
  "gemini-cli",
  "cline",
  "amp",
  "antigravity",
  "openclaw",
  "droid",
  "goose",
  "kilo",
  "kiro-cli",
  "hermes-agent",
  "opencode",
  "roo",
  "trae",
  "zed",
];

const rank = (slug: string) => {
  const index = FIRST.indexOf(slug);
  return index === -1 ? FIRST.length : index;
};

export const SKILL_AGENTS: readonly SkillAgent[] = AGENTS.map(
  ([name, slug, directory]) => ({ name, slug, directory }),
).sort((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name));

export const SKILL_AGENTS_DOCS =
  "https://github.com/vercel-labs/skills/blob/main/docs/agents.md";
