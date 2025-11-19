import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { detect } from "detect-package-manager";
import * as readline from "node:readline";
import { logger } from "./logger";

export function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function isPackageInstalled(
  pkg: string,
  cwd: string = process.cwd(),
): boolean {
  try {
    const pkgJsonPath = path.join(cwd, "package.json");
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      const deps = pkgJson.dependencies || {};
      const devDeps = pkgJson.devDependencies || {};
      if (deps[pkg] || devDeps[pkg]) {
        return true;
      }
    }
  } catch {
    // Fall back to node_modules check below.
  }
  const modulePath = path.join(cwd, "node_modules", ...pkg.split("/"));
  return fs.existsSync(modulePath);
}

export interface InstallCommand {
  command: string;
  args: string[];
}

export async function getInstallCommand(
  packageName: string | string[],
  cwd?: string,
): Promise<InstallCommand> {
  const pm = await detect({ cwd });
  const packages = Array.isArray(packageName) ? packageName : [packageName];
  switch (pm) {
    case "yarn":
      return { command: "yarn", args: ["add", ...packages] };
    case "pnpm":
      return { command: "pnpm", args: ["add", ...packages] };
    case "bun":
      return { command: "bun", args: ["add", ...packages] };
    default:
      return { command: "npm", args: ["install", ...packages] };
  }
}

export async function installPackage(
  packageName: string,
  cwd?: string,
): Promise<boolean> {
  try {
    const { command, args } = await getInstallCommand(packageName, cwd);
    const result = spawnSync(command, args, { stdio: "inherit", cwd });

    if (result.error || result.status !== 0) {
      logger.error(
        `Installation failed${
          result.error ? `: ${String(result.error)}` : "."
        }`,
      );
      return false;
    }

    return true;
  } catch (e) {
    logger.error(`Installation failed: ${String(e)}`);
    return false;
  }
}
