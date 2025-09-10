import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { detect } from "detect-package-manager";
import { sync as spawnSync } from "cross-spawn";

export const update = new Command()
  .name("update")
  .description(
    "Update all '@assistant-ui/*' and 'assistant-*' packages in package.json to latest versions using your package manager.",
  )
  .option("--dry", "Print the package manager command instead of running it.")
  .action(async (opts) => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      console.error(
        chalk.red("No package.json found in the current directory."),
      );
      process.exit(1);
    }
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const sections = ["dependencies", "devDependencies"];
    const targets: string[] = [];
    for (const section of sections) {
      if (!pkg[section]) continue;
      for (const dep in pkg[section]) {
        if (
          dep.startsWith("@assistant-ui/") ||
          dep === "assistant-stream" ||
          dep === "assistant-cloud"
        ) {
          targets.push(dep);
        }
      }
    }
    if (!targets.length) {
      console.log(chalk.yellow("No matching packages found to update."));
      return;
    }
    const pm = await detect({ cwd: process.cwd() });
    let cmd: string;
    if (pm === "yarn") {
      cmd = `yarn add ${targets.map((d) => `${d}@latest`).join(" ")}`;
    } else if (pm === "pnpm") {
      cmd = `pnpm add ${targets.map((d) => `${d}@latest`).join(" ")}`;
    } else if (pm === "bun") {
      cmd = `bun add ${targets.map((d) => `${d}@latest`).join(" ")}`;
    } else {
      cmd = `npm install ${targets.map((d) => `${d}@latest`).join(" ")}`;
    }
    if (opts.dry) {
      console.log(chalk.blue("\nDry run: would run the following command:"));
      console.log(cmd);
      return;
    }
    console.log(chalk.blue(`\nRunning: ${cmd}`));
    const result = spawnSync(cmd, { shell: true, stdio: "inherit" });
    if (result.status !== 0) {
      console.error(chalk.red("Package manager update failed."));
      process.exit(result.status || 1);
    }
    console.log(chalk.green("\nAll packages updated to latest version!"));
  });
