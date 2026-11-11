import { Command } from "commander";
import { create } from "./commands/create";
import { add } from "./commands/add";
import { codemodCommand, upgradeCommand } from "./commands/upgrade";
import { init } from "./commands/init";
import { update } from "./commands/update";
import { mcp } from "./commands/mcp";
import { agent } from "./commands/agent";
import { info } from "./commands/info";
import { doctor } from "./commands/doctor";
import { cloud } from "./commands/cloud";
import { setup } from "./commands/setup";
import { addAgentSetupHint } from "./lib/agent-setup-hint";

export function buildProgram() {
  const program = new Command()
    .name("assistant-ui")
    .description("add components and dependencies to your project")
    .addCommand(setup)
    .addCommand(add)
    .addCommand(addAgentSetupHint(create))
    .addCommand(addAgentSetupHint(init))
    .addCommand(mcp)
    .addCommand(codemodCommand)
    .addCommand(upgradeCommand)
    .addCommand(update)
    .addCommand(agent)
    .addCommand(cloud)
    .addCommand(info)
    .addCommand(doctor);
  return addAgentSetupHint(program, { beforeAction: false });
}
