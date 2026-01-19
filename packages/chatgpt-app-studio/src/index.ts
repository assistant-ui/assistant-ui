import fs from "node:fs";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { extract } from "tar";
import {
  isValidPackageName,
  isValidProjectPath,
  toValidPackageName,
  isEmpty,
  emptyDir,
  updatePackageJson,
  detectPackageManager,
} from "./utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_REPO = "assistant-ui/chatgpt-app-studio-starter";
const TEMPLATE_BRANCH = "main";

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

type TemplateType = "minimal" | "poi-map";

const TEMPLATE_COMPONENTS: Record<TemplateType, string[]> = {
  minimal: ["welcome"],
  "poi-map": ["poi-map"],
};

const TEMPLATE_EXPORT_CONFIG: Record<
  TemplateType,
  { entryPoint: string; exportName: string }
> = {
  minimal: {
    entryPoint: "lib/workbench/wrappers/welcome-card-sdk.tsx",
    exportName: "WelcomeCardSDK",
  },
  "poi-map": {
    entryPoint: "lib/workbench/wrappers/poi-map-sdk.tsx",
    exportName: "POIMapSDK",
  },
};

function generateComponentRegistry(components: string[]): string {
  const imports: string[] = [];
  const entries: string[] = [];

  if (components.includes("welcome")) {
    imports.push('import { WelcomeCardSDK } from "./wrappers";');
    entries.push(`  {
    id: "welcome",
    label: "Welcome",
    description: "A simple starter widget - the perfect starting point",
    category: "cards",
    component: WelcomeCardSDK,
    defaultProps: {
      title: "Welcome!",
      message:
        "This is your ChatGPT App. Edit this component to build something amazing.",
    },
    exportConfig: {
      entryPoint: "lib/workbench/wrappers/welcome-card-sdk.tsx",
      exportName: "WelcomeCardSDK",
    },
  }`);
  }

  if (components.includes("poi-map")) {
    imports.push('import { POIMapSDK } from "./wrappers";');
    entries.push(`  {
    id: "poi-map",
    label: "POI Map",
    description:
      "Interactive map with points of interest - demonstrates display mode transitions, widget state, and tool calls",
    category: "data",
    component: POIMapSDK,
    defaultProps: {
      id: "workbench-poi-map",
      title: "San Francisco Highlights",
      pois: [
        {
          id: "1",
          name: "Golden Gate Bridge",
          category: "landmark",
          lat: 37.8199,
          lng: -122.4783,
          description: "Iconic suspension bridge spanning the Golden Gate strait",
          rating: 4.8,
          imageUrl: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=400",
        },
        {
          id: "2",
          name: "Fisherman's Wharf",
          category: "entertainment",
          lat: 37.808,
          lng: -122.4177,
          description: "Historic waterfront with restaurants and attractions",
          rating: 4.3,
        },
      ],
      initialCenter: { lat: 37.7749, lng: -122.4194 },
      initialZoom: 12,
    },
    exportConfig: {
      entryPoint: "lib/workbench/wrappers/poi-map-sdk.tsx",
      exportName: "POIMapSDK",
    },
  }`);
  }

  return `"use client";

import type { ComponentType } from "react";
${imports.join("\n")}

export type ComponentCategory = "cards" | "lists" | "forms" | "data";

type AnyComponent = ComponentType<any>;

export interface WorkbenchComponentEntry {
  id: string;
  label: string;
  description: string;
  category: ComponentCategory;
  component: AnyComponent;
  defaultProps: Record<string, unknown>;
  exportConfig: {
    entryPoint: string;
    exportName: string;
  };
}

export const workbenchComponents: WorkbenchComponentEntry[] = [
${entries.join(",\n")}
];

export function getComponent(id: string): WorkbenchComponentEntry | undefined {
  return workbenchComponents.find((c) => c.id === id);
}

export function getComponentIds(): string[] {
  return workbenchComponents.map((c) => c.id);
}
`;
}

function generateWrappersIndex(components: string[]): string {
  const exports: string[] = [];
  if (components.includes("welcome")) {
    exports.push('export { WelcomeCardSDK } from "./welcome-card-sdk";');
  }
  if (components.includes("poi-map")) {
    exports.push('export { POIMapSDK } from "./poi-map-sdk";');
  }
  return exports.length > 0 ? exports.join("\n") + "\n" : "// No components\n";
}

function generateExamplesIndex(components: string[]): string {
  const exports: string[] = [];
  if (components.includes("welcome")) {
    exports.push('export * from "./welcome-card";');
  }
  if (components.includes("poi-map")) {
    exports.push('export * from "./poi-map";');
  }
  return exports.length > 0 ? exports.join("\n") + "\n" : "// No examples\n";
}

function updateExportScriptDefaults(
  targetDir: string,
  entryPoint: string,
  exportName: string,
): void {
  const exportScriptPath = path.join(targetDir, "scripts/export.ts");
  let content = fs.readFileSync(exportScriptPath, "utf-8");

  // Update the default entryPoint
  content = content.replace(
    /entryPoint: "lib\/workbench\/wrappers\/[^"]+"/,
    `entryPoint: "${entryPoint}"`,
  );

  // Update the default exportName
  content = content.replace(
    /exportName: "[^"]+",\n\s+name:/,
    `exportName: "${exportName}",\n    name:`,
  );

  // Update help text defaults
  content = content.replace(
    /Widget entry point \(default: [^)]+\)/,
    `Widget entry point (default: ${entryPoint})`,
  );
  content = content.replace(
    /Export name from entry file \(default: [^)]+\)/,
    `Export name from entry file (default: ${exportName})`,
  );

  fs.writeFileSync(exportScriptPath, content);
}

function applyTemplate(targetDir: string, template: TemplateType): void {
  const components = TEMPLATE_COMPONENTS[template];

  // Update component registry
  const registryPath = path.join(
    targetDir,
    "lib/workbench/component-registry.tsx",
  );
  fs.writeFileSync(registryPath, generateComponentRegistry(components));

  // Update wrappers index
  const wrappersIndexPath = path.join(
    targetDir,
    "lib/workbench/wrappers/index.ts",
  );
  fs.writeFileSync(wrappersIndexPath, generateWrappersIndex(components));

  // Update examples index
  const examplesIndexPath = path.join(
    targetDir,
    "components/examples/index.ts",
  );
  fs.writeFileSync(examplesIndexPath, generateExamplesIndex(components));

  // Remove unused example directories
  const examplesDir = path.join(targetDir, "components/examples");
  if (!components.includes("welcome")) {
    fs.rmSync(path.join(examplesDir, "welcome-card"), {
      recursive: true,
      force: true,
    });
    fs.rmSync(
      path.join(targetDir, "lib/workbench/wrappers/welcome-card-sdk.tsx"),
      { force: true },
    );
  }
  if (!components.includes("poi-map")) {
    fs.rmSync(path.join(examplesDir, "poi-map"), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(targetDir, "lib/workbench/wrappers/poi-map-sdk.tsx"), {
      force: true,
    });
  }

  // Update export script defaults
  const exportConfig = TEMPLATE_EXPORT_CONFIG[template];
  updateExportScriptDefaults(
    targetDir,
    exportConfig.entryPoint,
    exportConfig.exportName,
  );
}

interface ProjectConfig {
  name: string;
  packageName: string;
  description: string;
  template: TemplateType;
  includeServer: boolean;
}

async function downloadTemplate(targetDir: string): Promise<void> {
  const tarballUrl = `https://github.com/${TEMPLATE_REPO}/archive/refs/heads/${TEMPLATE_BRANCH}.tar.gz`;
  const tempDir = path.join(os.tmpdir(), `chatgpt-app-studio-${Date.now()}`);
  const tarballPath = path.join(tempDir, "template.tar.gz");

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // Download the tarball
    const response = await fetch(tarballUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download template: ${response.status} ${response.statusText}`,
      );
    }

    const fileStream = createWriteStream(tarballPath);
    const body = response.body;
    if (!body) {
      throw new Error("No response body received");
    }

    const nodeStream = Readable.fromWeb(
      body as Parameters<typeof Readable.fromWeb>[0],
    );
    await pipeline(nodeStream, fileStream);

    // Extract the tarball
    fs.mkdirSync(targetDir, { recursive: true });
    await extract({
      file: tarballPath,
      cwd: targetDir,
      strip: 1, // Remove the top-level directory (e.g., chatgpt-app-studio-starter-main/)
    });
  } finally {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
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
        validate: (value): string | undefined => {
          if (!value) return "Project name is required";
          const pathCheck = isValidProjectPath(value);
          if (!pathCheck.valid) return pathCheck.error;
          if (!isValidPackageName(toValidPackageName(value))) {
            return "Invalid project name";
          }
          return undefined;
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

  const template = await p.select({
    message: "Choose a starter template:",
    options: [
      {
        value: "minimal",
        label: "Minimal",
        hint: "Simple welcome card - perfect starting point",
      },
      {
        value: "poi-map",
        label: "Locations App",
        hint: "Interactive map demo with full SDK features",
      },
    ],
    initialValue: "minimal",
  });

  if (p.isCancel(template)) {
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
    template: template as TemplateType,
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
  s.start("Downloading template...");

  try {
    await downloadTemplate(targetDir);
  } catch (error) {
    s.stop("Download failed");
    p.log.error(
      `Failed to download template: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  s.message("Creating project...");
  updatePackageJson(targetDir, config.packageName, config.description);

  s.message("Applying template...");
  applyTemplate(targetDir, config.template);

  if (!config.includeServer) {
    fs.rmSync(path.join(targetDir, "server"), { recursive: true, force: true });
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
