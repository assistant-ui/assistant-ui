import spawn from "cross-spawn";

export interface LaunchOptions {
  /** Absolute path to the Claude Code plugin directory */
  pluginDir: string;

  /** Skill name to invoke (e.g. "assistant-ui") */
  skillName?: string;

  /** The user's prompt */
  prompt: string;

  /** If true, print the command instead of running it */
  dry?: boolean;
}

export function launch(options: LaunchOptions): void {
  const { pluginDir, skillName, prompt, dry } = options;

  const claudeArgs: string[] = [];

  if (skillName && prompt) {
    claudeArgs.push(`/${skillName} ${prompt}`);
  } else if (prompt) {
    claudeArgs.push(prompt);
  }

  claudeArgs.push("--plugin-dir", pluginDir);

  if (dry) {
    const cmd = ["claude", ...claudeArgs];
    const escaped = cmd.map((a) => (a.includes(" ") ? `"${a}"` : a));
    console.log(escaped.join(" "));
    return;
  }

  const result = spawn.sync("claude", claudeArgs, { stdio: "inherit" });

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(
        "Error: 'claude' CLI not found. Install Claude Code first:",
      );
      console.error("  npm install -g @anthropic-ai/claude-code");
      process.exit(1);
    }
    throw result.error;
  }

  if (result.status !== null && result.status !== 0) {
    process.exit(result.status);
  }
}
