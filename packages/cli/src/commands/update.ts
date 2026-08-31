import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/utils/logger";
import { logPackageJsonParseError } from "../lib/utils/package-json";
import { getInstallCommand } from "../lib/utils/package-manager";
import { runSpawn, SpawnExitError, SpawnSignalError } from "../lib/run-spawn";

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

    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
    let pkg: Record<string, Record<string, string> | undefined>;
    try {
      pkg = JSON.parse(packageJsonContent);
    } catch {
      logPackageJsonParseError(packageJsonPath, "update");
      console.error("No changes were written.");
      process.exit(1);
    }
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
    try {
      await runSpawn(installCmd.command, installCmd.args, opts.cwd);
    } catch (error) {
      if (error instanceof SpawnSignalError) throw error;
      logger.error("Package manager update failed.");
      process.exit(error instanceof SpawnExitError ? error.code : 1);
    }

    logger.break();
    logger.success("All packages updated to latest version!");
  });
