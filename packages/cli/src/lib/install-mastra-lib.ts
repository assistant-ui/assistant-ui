import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { sync as globSync } from "glob";
import * as readline from "readline";
import { detect } from "detect-package-manager";

function askQuestion(query: string): Promise<string> {
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

function isPackageInstalled(pkg: string): boolean {
  const cwd = process.cwd();
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

export default async function installMastraLib(): Promise<void> {
  const cwd = process.cwd();
  const pattern = "**/*.{js,jsx,ts,tsx}";
  const files = globSync(pattern, {
    cwd,
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  });

  let found = false;
  let hasCoreImport = false;
  let hasMemoryImport = false;
  let hasLibSqlImport = false;

  // Check for various Mastra package imports
  for (const file of files) {
    const fullPath = path.join(cwd, file);
    const content = fs.readFileSync(fullPath, "utf8");

    if (content.includes("@assistant-ui/react-mastra")) {
      found = true;
    }

    if (content.includes("@mastra/core")) {
      hasCoreImport = true;
    }

    if (content.includes("@mastra/memory")) {
      hasMemoryImport = true;
    }

    if (content.includes("@mastra/libsql")) {
      hasLibSqlImport = true;
    }

    // Also check for legacy Mastra patterns
    if (
      content.includes("new Mastra(") ||
      content.includes("mastra.getAgent")
    ) {
      found = true;
      hasCoreImport = true;
    }
  }

  if (found || hasCoreImport || hasMemoryImport || hasLibSqlImport) {
    // Check what packages need to be installed
    const packagesToInstall = [];

    if (found && !isPackageInstalled("@assistant-ui/react-mastra")) {
      packagesToInstall.push("@assistant-ui/react-mastra");
    }

    if (hasCoreImport && !isPackageInstalled("@mastra/core")) {
      packagesToInstall.push("@mastra/core");
    }

    if (hasMemoryImport && !isPackageInstalled("@mastra/memory")) {
      packagesToInstall.push("@mastra/memory");
    }

    if (hasLibSqlImport && !isPackageInstalled("@mastra/libsql")) {
      packagesToInstall.push("@mastra/libsql");
    }

    if (packagesToInstall.length === 0) {
      console.log(
        "All Mastra packages are already installed. Skipping installation.",
      );
      return;
    }

    const packageList = packagesToInstall.join(", ");
    const answer = await askQuestion(
      `Mastra imports were found but the following packages are not installed: ${packageList}. Do you want to install them? (Y/n) `,
    );

    if (answer === "" || answer.toLowerCase().startsWith("y")) {
      const pm = await detect();
      let cmd = "";

      if (pm === "yarn") {
        cmd = `yarn add ${packagesToInstall.join(" ")}`;
      } else if (pm === "pnpm") {
        cmd = `pnpm add ${packagesToInstall.join(" ")}`;
      } else if (pm === "bun") {
        cmd = `bun add ${packagesToInstall.join(" ")}`;
      } else {
        cmd = `npm install ${packagesToInstall.join(" ")}`;
      }

      try {
        console.log(`Installing packages: ${packageList}`);
        execSync(cmd, { stdio: "inherit" });
        console.log("✅ Mastra packages installed successfully!");
      } catch (e) {
        console.error("❌ Installation failed:", e);
        console.log("\n💡 You can install the packages manually:");
        console.log(`   ${cmd}`);
      }
    } else {
      console.log("Skipping installation.");
    }
  } else {
    console.log("No Mastra imports found; skipping installation.");
  }
}

// Export function for direct use in other CLI commands
export function isMastraInstalled(): boolean {
  return (
    isPackageInstalled("@assistant-ui/react-mastra") ||
    isPackageInstalled("@mastra/core") ||
    isPackageInstalled("@mastra/memory") ||
    isPackageInstalled("@mastra/libsql")
  );
}

export function hasMastraImports(): boolean {
  const cwd = process.cwd();
  const pattern = "**/*.{js,jsx,ts,tsx}";
  const files = globSync(pattern, {
    cwd,
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  });

  for (const file of files) {
    const fullPath = path.join(cwd, file);
    const content = fs.readFileSync(fullPath, "utf8");

    // Check for Mastra usage patterns
    if (
      content.includes("new Mastra(") ||
      content.includes("mastra.getAgent") ||
      content.includes("@mastra/core") ||
      content.includes("@mastra/memory") ||
      content.includes("@mastra/libsql") ||
      content.includes("@assistant-ui/react-mastra")
    ) {
      return true;
    }
  }

  return false;
}
