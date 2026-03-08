import { Command } from "commander";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { launch } from "@assistant-ui/agent-launcher";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getPluginPath(): string {
  // In dist/, plugin is at ../../plugin relative to dist/commands/agent.js
  // In dev (src/), plugin is at ../../plugin relative to src/commands/
  const candidates = [
    resolve(__dirname, "..", "..", "plugin"),
    resolve(__dirname, "..", "plugin"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0]!;
}

export const agent = new Command()
  .name("agent")
  .description("launch Claude Code with assistant-ui skills")
  .argument("<prompt...>", "prompt for the agent")
  .option("--dry", "print the command instead of running it")
  .action((promptParts: string[], opts) => {
    const prompt = promptParts.join(" ");

    launch({
      pluginDir: getPluginPath(),
      skillName: "assistant-ui",
      prompt,
      dry: opts.dry,
    });
  });
