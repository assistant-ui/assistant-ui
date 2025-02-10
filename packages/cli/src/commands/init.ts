import { Command } from "commander";
import { spawn } from "cross-spawn";

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in a new or existing project")
  .action(() => {
    const child = spawn(
      "npx",
      [
        `shadcn@latest`,
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
