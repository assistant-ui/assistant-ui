import { Command } from "commander";
import { launch } from "@assistant-ui/agent-launcher";
import { ensureSkillsPlugin, skillsPluginDir } from "../lib/agent-skill";

export const agent = new Command()
  .name("agent")
  .description("launch Claude Code with assistant-ui skills")
  .argument("<prompt...>", "prompt for the agent")
  .option("--dry", "print the command instead of running it")
  .action(async (promptParts: string[], opts: { dry?: boolean }) => {
    const dry = opts.dry === true;
    const pluginDir = dry ? skillsPluginDir() : await ensureSkillsPlugin();

    launch({
      pluginDir,
      skillName: "assistant-ui",
      prompt: promptParts.join(" "),
      dry,
    });
  });
