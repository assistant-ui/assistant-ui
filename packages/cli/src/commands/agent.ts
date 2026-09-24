import { Command } from "commander";
import { launch } from "@assistant-ui/agent-launcher";
import { ensureSkillsPlugin, skillsPluginDir } from "../lib/agent-skill";
import { logger } from "../lib/utils/logger";

async function resolvePluginDir(dry: boolean): Promise<string> {
  if (dry) return skillsPluginDir();
  try {
    return await ensureSkillsPlugin();
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export const agent = new Command()
  .name("agent")
  .description("launch Claude Code with assistant-ui skills")
  .argument("<prompt...>", "prompt for the agent")
  .option("--dry", "print the command instead of running it")
  .action(async (promptParts: string[], opts: { dry?: boolean }) => {
    const dry = opts.dry === true;
    const pluginDir = await resolvePluginDir(dry);

    launch({
      pluginDir,
      skillName: "assistant-ui",
      prompt: promptParts.join(" "),
      dry,
    });
  });
