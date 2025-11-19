import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { detect } from "detect-package-manager";
import * as readline from "node:readline";

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

export async function getInstallCommand(
  packageName: string,
  cwd?: string,
): Promise<string> {
  const pm = await detect({ cwd });
  switch (pm) {
    case "yarn":
      return `yarn add ${packageName}`;
    case "pnpm":
      return `pnpm add ${packageName}`;
    case "bun":
      return `bun add ${packageName}`;
    default:
      return `npm install ${packageName}`;
  }
}

export async function installPackage(
  packageName: string,
  cwd?: string,
): Promise<boolean> {
  try {
    const cmd = await getInstallCommand(packageName, cwd);
    execSync(cmd, { stdio: "inherit", cwd });
    return true;
  } catch (e) {
    console.error("Installation failed:", e);
    return false;
  }
}
