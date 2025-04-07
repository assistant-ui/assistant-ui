import { Command } from "commander";
import { spawn } from "cross-spawn";

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in a new or existing project")
  .action(() => {
    const child = spawn(
      "npx",
      [
        `shadcn@2.3.0`, // TODO 2.4 does not init a project if run in an empty folder
        "add",
        "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json",
      ],
      {
        stdio: "inherit",
      },
    );

    child.on("error", (error) => {
      console.error(`Error: ${error.message}`);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.log(`other-package-script process exited with code ${code}`);
      }
    });
  });
