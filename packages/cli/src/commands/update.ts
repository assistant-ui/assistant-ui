import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { sync as spawnSync } from "cross-spawn";
import { logger } from "../lib/utils/logger";
import { getInstallCommand } from "../lib/utils/package-manager";

export const update = new Command()
  .name("update")
  .description(
    "Update all '@assistant-ui/*' and 'assistant-*' packages in package.json to latest versions using your package manager.",
  )
  .option("--dry", "Print the package manager command instead of running it.")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .action(async (opts) => {
    const packageJsonPath = path.join(opts.cwd, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      logger.error("No package.json found in the current directory.");
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
      logger.warn("No matching packages found to update.");
      return;
    }

    logger.info(`Found ${targets.length} package(s) to update:`);
    targets.forEach((pkg) => {
      logger.info(`  - ${pkg}`);
    });
    logger.break();

    // Build command using the utility
    const installCmd = await getInstallCommand(
      targets.map((d) => `${d}@latest`),
      opts.cwd,
    );

    if (opts.dry) {
      logger.info("Dry run: would run the following command:");
      logger.info(`  ${installCmd.command} ${installCmd.args.join(" ")}`);
      return;
    }

    logger.step("Updating packages...");
    const result = spawnSync(installCmd.command, installCmd.args, {
      stdio: "inherit",
      cwd: opts.cwd,
    });

    if (result.status !== 0) {
      logger.error("Package manager update failed.");
      process.exit(result.status || 1);
    }

    logger.break();
    logger.success("All packages updated to latest version!");
  });
