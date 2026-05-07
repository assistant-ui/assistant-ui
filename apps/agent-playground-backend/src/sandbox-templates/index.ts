export const DEFAULT_SANDBOX_WORKSPACE_ROOT = "/workspace";
export const DEFAULT_AGENT_SUPPORT_DIR = ".codingagent";
export const LEGACY_SANDBOX_WORKSPACE_ENTRIES = [
  "AGENTS.md",
  "codex-input",
  "config",
  "runs",
];

export interface SandboxTemplateSpec {
  productId: "assistant-ui";
  image: string;
  workspaceRoot: string;
  reservedWorkspaceEntries: string[];
  agentSupportDir: string;
  runtimeAssetRoot: string;
}

export function getReservedWorkspaceEntries(): string[] {
  return [".agent", DEFAULT_AGENT_SUPPORT_DIR];
}

export function resolveSandboxTemplateSpec(env: NodeJS.ProcessEnv = process.env): SandboxTemplateSpec {
  const image = env.BLAXEL_WORKSPACE_TEMPLATE ?? env.BL_SANDBOX_TEMPLATE;
  if (!image) {
    throw new Error("No Blaxel sandbox template configured. Set BLAXEL_WORKSPACE_TEMPLATE.");
  }
  return {
    productId: "assistant-ui",
    image,
    workspaceRoot: env.BLAXEL_WORKSPACE_ROOT ?? DEFAULT_SANDBOX_WORKSPACE_ROOT,
    reservedWorkspaceEntries: getReservedWorkspaceEntries(),
    agentSupportDir: DEFAULT_AGENT_SUPPORT_DIR,
    runtimeAssetRoot: "/opt/assistant-ui-agent/runtime",
  };
}
