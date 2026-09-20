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

export function buildProgram() {
  return new Command()
    .name("assistant-ui")
    .description("add components and dependencies to your project")
    .addCommand(add)
    .addCommand(create)
    .addCommand(init)
    .addCommand(mcp)
    .addCommand(codemodCommand)
    .addCommand(upgradeCommand)
    .addCommand(update)
    .addCommand(agent)
    .addCommand(info)
    .addCommand(doctor);
}
