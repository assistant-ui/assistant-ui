import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isValidPackageName,
  isValidProjectPath,
  toValidPackageName,
  isEmpty,
  emptyDir,
  copyDir,
  renameFiles,
  updatePackageJson,
  detectPackageManager,
  generateMcpServer,
} from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_NODE_VERSION = { major: 20, minor: 9, patch: 0 } as const;

function parseNodeVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} | null {
  const [majorRaw, minorRaw, patchRaw] = version.split(".");
  const major = Number.parseInt(majorRaw ?? "", 10);
  const minor = Number.parseInt(minorRaw ?? "", 10);
  const patch = Number.parseInt(patchRaw ?? "", 10);
  if (![major, minor, patch].every(Number.isFinite)) return null;
  return { major, minor, patch };
}

function isVersionAtLeast(
  current: { major: number; minor: number; patch: number },
  required: { major: number; minor: number; patch: number },
): boolean {
  if (current.major !== required.major) return current.major > required.major;
  if (current.minor !== required.minor) return current.minor > required.minor;
  return current.patch >= required.patch;
}

function ensureSupportedNodeVersion(): void {
  const current = parseNodeVersion(process.versions.node);
  if (!current) return;

  if (!isVersionAtLeast(current, REQUIRED_NODE_VERSION)) {
    console.error(
      pc.red(
        `chatgpt-app-studio requires Node.js >=${REQUIRED_NODE_VERSION.major}.${REQUIRED_NODE_VERSION.minor}.${REQUIRED_NODE_VERSION.patch} (detected ${process.versions.node}).`,
      ),
    );
    console.error(pc.dim("Please upgrade Node.js (recommended: latest LTS)."));
    process.exit(1);
  }
}

function getVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function showHelp(): void {
  console.log(`
chatgpt-app-studio v${getVersion()}

Create ChatGPT apps with a local development workbench.

Requirements:
  Node.js >=${REQUIRED_NODE_VERSION.major}.${REQUIRED_NODE_VERSION.minor}.${REQUIRED_NODE_VERSION.patch}

Usage:
  npx chatgpt-app-studio [project-name]

Options:
  --help, -h     Show this help message
  --version, -v  Show version number

Examples:
  npx chatgpt-app-studio my-app
  npx chatgpt-app-studio
`);
}

function quotePath(p: string): string {
  if (!/[ $`"'\\&|;<>(){}[\]*?!#~]/.test(p)) {
    return p;
  }
  return `'${p.replace(/'/g, "'\\''")}'`;
}

interface ProjectConfig {
  name: string;
  packageName: string;
  description: string;
  includeServer: boolean;
}

async function main() {
  ensureSupportedNodeVersion();

  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(getVersion());
    process.exit(0);
  }

  const argProjectName = args.find((arg) => !arg.startsWith("-"));

  p.intro(pc.bgCyan(pc.black(" chatgpt-app-studio ")));

  if (argProjectName) {
    const pathCheck = isValidProjectPath(argProjectName);
    if (!pathCheck.valid) {
      p.log.error(pathCheck.error ?? "Invalid project path");
      process.exit(1);
    }
  }

  const projectName = argProjectName
    ? argProjectName
    : await p.text({
        message: "Project name:",
        placeholder: "my-chatgpt-app",
        validate: (value) => {
          if (!value) return "Project name is required";
          const pathCheck = isValidProjectPath(value);
          if (!pathCheck.valid) return pathCheck.error;
          if (!isValidPackageName(toValidPackageName(value))) {
            return "Invalid project name";
          }
        },
      });

  if (p.isCancel(projectName)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const description = await p.text({
    message: "App description:",
    placeholder: "A ChatGPT app that helps users...",
    initialValue: "",
  });

  if (p.isCancel(description)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const includeServer = await p.confirm({
    message: "Include MCP server?",
    initialValue: true,
  });

  if (p.isCancel(includeServer)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const targetDir = path.resolve(process.cwd(), projectName as string);
  const packageName =
    projectName === "."
      ? toValidPackageName(path.basename(targetDir))
      : toValidPackageName(projectName as string);

  const config: ProjectConfig = {
    name: projectName as string,
    packageName,
    description: (description as string) || "",
    includeServer: includeServer as boolean,
  };

  if (!isEmpty(targetDir)) {
    const overwrite = await p.confirm({
      message: `Directory "${projectName}" is not empty. Remove existing files?`,
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }

    // Avoid deleting the directory itself (especially dangerous for `.`).
    // Instead, remove its contents while preserving `.git/`.
    emptyDir(targetDir);
  }

  const s = p.spinner();
  s.start("Creating project...");

  const templateDir = path.resolve(__dirname, "../templates/starter");

  if (!fs.existsSync(templateDir)) {
    s.stop("Template not found");
    p.log.error(
      `Template directory not found at ${templateDir}. Make sure templates are included in the package.`,
    );
    process.exit(1);
  }

  copyDir(templateDir, targetDir);
  renameFiles(targetDir);
  updatePackageJson(targetDir, config.packageName, config.description);

  if (config.includeServer) {
    s.message("Generating MCP server...");
    await generateMcpServer(targetDir, config);
  }

  s.stop("Project created!");

  const pm = detectPackageManager();
  const installCmd =
    pm === "yarn" ? "yarn" : pm === "bun" ? "bun install" : `${pm} install`;
  const runCmd = pm === "npm" ? "npm run" : pm === "bun" ? "bun run" : pm;
  const devCmd = `${runCmd} dev`;

  const quotedName = quotePath(projectName as string);
  const nextSteps = [`cd ${quotedName}`, installCmd];

  if (config.includeServer) {
    nextSteps.push(`cd server && ${installCmd}`);
    nextSteps.push("cd ..");
  }

  nextSteps.push(devCmd);

  if (config.includeServer) {
    nextSteps.push("");
    nextSteps.push(pc.dim("# This starts both Next.js and MCP server"));
  }

  p.note(nextSteps.join("\n"), "Next steps");

  if (config.includeServer) {
    p.log.info(
      `${pc.dim("Test your MCP server with:")} ${pc.cyan(`cd server && ${runCmd} inspect`)}`,
    );
  }

  p.log.info(
    `${pc.dim("Export for production:")} ${pc.cyan(`${runCmd} export`)}`,
  );

  p.outro(pc.green("Happy building!"));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
