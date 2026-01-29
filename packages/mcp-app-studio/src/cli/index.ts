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

const TEMPLATE_REPO = "assistant-ui/mcp-app-studio-starter";
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
        `mcp-app-studio requires Node.js >=${REQUIRED_NODE_VERSION.major}.${REQUIRED_NODE_VERSION.minor}.${REQUIRED_NODE_VERSION.patch} (detected ${process.versions.node}).`,
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
mcp-app-studio v${getVersion()}

Create interactive apps for ChatGPT and MCP hosts (like Claude Desktop).

${pc.bold("Requirements:")}
  Node.js >=${REQUIRED_NODE_VERSION.major}.${REQUIRED_NODE_VERSION.minor}.${REQUIRED_NODE_VERSION.patch}

${pc.bold("Usage:")}
  npx mcp-app-studio [project-name] [options]

${pc.bold("Options:")}
  --help, -h              Show this help message
  --version, -v           Show version number
  -y, --yes               Non-interactive mode (use defaults or flag values)
  --template <name>       Template to use: minimal, poi-map (default: minimal)
  --include-server        Include MCP server (default when not using -y)
  --no-server             Do not include MCP server
  --description <text>    App description

${pc.bold("Examples:")}
  npx mcp-app-studio my-app
  npx mcp-app-studio .          ${pc.dim("# Use current directory")}
  npx mcp-app-studio my-app -y --template poi-map --include-server

${pc.bold("Learn more:")}
  Documentation: https://github.com/assistant-ui/mcp-app-studio
  Examples:      https://github.com/assistant-ui/mcp-app-studio-starter
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

const TEMPLATE_DEFAULT_COMPONENT: Record<TemplateType, string> = {
  minimal: "welcome",
  "poi-map": "poi-map",
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

// The main app component (first in the list)
export const appComponent = workbenchComponents[0]!;

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
  return exports.length > 0 ? `${exports.join("\n")}\n` : "// No components\n";
}

function generateExamplesIndex(components: string[]): string {
  const exports: string[] = [];
  if (components.includes("welcome")) {
    exports.push('export * from "./welcome-card";');
  }
  if (components.includes("poi-map")) {
    exports.push('export * from "./poi-map";');
  }
  return exports.length > 0 ? `${exports.join("\n")}\n` : "// No examples\n";
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

function generateWorkbenchIndexExport(components: string[]): string {
  const exports: string[] = [];
  if (components.includes("welcome")) {
    exports.push("WelcomeCardSDK");
  }
  if (components.includes("poi-map")) {
    exports.push("POIMapSDK");
  }
  return exports.length > 0
    ? `export { ${exports.join(", ")} } from "./wrappers";`
    : "// No SDK exports";
}

function updateWorkbenchIndex(targetDir: string, components: string[]): void {
  const indexPath = path.join(targetDir, "lib/workbench/index.ts");
  let content = fs.readFileSync(indexPath, "utf-8");

  // Replace the wrappers export line (or add if missing)
  const wrappersExportRegex = /export \{[^}]*\} from "\.\/wrappers";/;
  const newExport = generateWorkbenchIndexExport(components);

  if (wrappersExportRegex.test(content)) {
    content = content.replace(wrappersExportRegex, newExport);
  } else {
    // If no wrappers export exists, add it at the end
    content = content.trimEnd() + "\n\n" + newExport + "\n";
  }

  fs.writeFileSync(indexPath, content);
}

function updateWorkbenchStoreDefault(
  targetDir: string,
  defaultComponent: string,
): void {
  const storePath = path.join(targetDir, "lib/workbench/store.ts");
  let content = fs.readFileSync(storePath, "utf-8");

  // Replace the default selectedComponent
  content = content.replace(
    /selectedComponent: "[^"]+"/,
    `selectedComponent: "${defaultComponent}"`,
  );

  fs.writeFileSync(storePath, content);
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

  // Update main workbench index to export correct wrappers
  updateWorkbenchIndex(targetDir, components);

  // Update workbench store default selected component
  const defaultComponent = TEMPLATE_DEFAULT_COMPONENT[template];
  updateWorkbenchStoreDefault(targetDir, defaultComponent);

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
  const tempDir = path.join(os.tmpdir(), `mcp-app-studio-${Date.now()}`);
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
      strip: 1, // Remove the top-level directory (e.g., mcp-app-studio-starter-main/)
    });
  } finally {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

interface ParsedArgs {
  projectName?: string;
  yes: boolean;
  template?: TemplateType;
  includeServer?: boolean;
  description?: string;
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    yes: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "-y":
      case "--yes":
        parsed.yes = true;
        break;
      case "--template":
        if (next && (next === "minimal" || next === "poi-map")) {
          parsed.template = next as TemplateType;
          i++;
        }
        break;
      case "--include-server":
        parsed.includeServer = true;
        break;
      case "--no-server":
        parsed.includeServer = false;
        break;
      case "--description":
        if (next && !next.startsWith("-")) {
          parsed.description = next;
          i++;
        }
        break;
      default:
        if (arg && !arg.startsWith("-") && !parsed.projectName) {
          parsed.projectName = arg;
        }
    }
  }

  return parsed;
}

async function main() {
  ensureSupportedNodeVersion();

  const rawArgs = process.argv.slice(2);

  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  if (rawArgs.includes("--version") || rawArgs.includes("-v")) {
    console.log(getVersion());
    process.exit(0);
  }

  const parsedArgs = parseArgs(rawArgs);
  const nonInteractive = parsedArgs.yes;

  p.intro(pc.bgCyan(pc.black(" mcp-app-studio ")));

  if (parsedArgs.projectName) {
    const pathCheck = isValidProjectPath(parsedArgs.projectName);
    if (!pathCheck.valid) {
      p.log.error(pathCheck.error ?? "Invalid project path");
      process.exit(1);
    }
  }

  let projectName: string | symbol;
  if (parsedArgs.projectName) {
    projectName = parsedArgs.projectName;
  } else if (nonInteractive) {
    p.log.error("Project name is required in non-interactive mode");
    process.exit(1);
  } else {
    projectName = await p.text({
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
  }

  if (p.isCancel(projectName)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  let description: string | symbol;
  if (parsedArgs.description !== undefined) {
    description = parsedArgs.description;
  } else if (nonInteractive) {
    description = "";
  } else {
    description = await p.text({
      message: "App description:",
      placeholder: "A ChatGPT app that helps users...",
      initialValue: "",
    });
  }

  if (p.isCancel(description)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  let template: TemplateType | symbol;
  if (parsedArgs.template !== undefined) {
    template = parsedArgs.template;
  } else if (nonInteractive) {
    template = "minimal";
  } else {
    template = await p.select({
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
  }

  if (p.isCancel(template)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  let includeServer: boolean | symbol;
  if (parsedArgs.includeServer !== undefined) {
    includeServer = parsedArgs.includeServer;
  } else if (nonInteractive) {
    includeServer = true;
  } else {
    includeServer = await p.confirm({
      message: "Include MCP server?",
      initialValue: true,
    });
  }

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
    if (nonInteractive) {
      // In non-interactive mode, overwrite without prompting
      emptyDir(targetDir);
    } else {
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
  updatePackageJson(
    targetDir,
    config.packageName,
    config.description,
    config.includeServer,
  );

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
  const nextSteps = [`cd ${quotedName}`, installCmd, devCmd];

  if (config.includeServer) {
    nextSteps.push("");
    nextSteps.push(pc.dim("# This starts both Next.js and MCP server"));
  }

  p.note(nextSteps.join("\n"), "Get started");

  // Project structure guide
  const structureGuide = [
    `${pc.cyan("components/examples/")}  ${pc.dim("← Your widget components")}`,
    `${pc.cyan("lib/workbench/")}        ${pc.dim("← SDK wrappers for workbench")}`,
  ];
  if (config.includeServer) {
    structureGuide.push(
      `${pc.cyan("server/")}               ${pc.dim("← MCP server for Claude Desktop")}`,
    );
  }
  p.note(structureGuide.join("\n"), "Project structure");

  // Key commands
  const keyCommands: string[] = [];
  keyCommands.push(
    `${pc.cyan(`${runCmd} dev`)}      ${pc.dim("Start the development workbench")}`,
  );
  keyCommands.push(
    `${pc.cyan(`${runCmd} export`)}   ${pc.dim("Build & export for ChatGPT")}`,
  );
  if (config.includeServer) {
    keyCommands.push(
      `${pc.cyan(`cd server && ${runCmd} inspect`)}  ${pc.dim("Test MCP server locally")}`,
    );
  }
  p.note(keyCommands.join("\n"), "Key commands");

  // Platform-specific tips
  p.log.message("");
  p.log.step(pc.bold("Building for multiple platforms:"));
  p.log.message(
    `  ${pc.dim("•")} Use ${pc.cyan("useFeature('widgetState')")} to check for ChatGPT features`,
  );
  p.log.message(
    `  ${pc.dim("•")} Use ${pc.cyan("useFeature('modelContext')")} to check for MCP features`,
  );
  p.log.message(
    `  ${pc.dim("•")} Call ${pc.cyan("enableDebugMode()")} in browser console to debug platform detection`,
  );
  p.log.message("");

  // Documentation links
  p.log.step(pc.bold("Learn more:"));
  p.log.message(
    `  ${pc.dim("•")} SDK Docs:   ${pc.cyan("https://github.com/assistant-ui/mcp-app-studio#sdk")}`,
  );
  p.log.message(
    `  ${pc.dim("•")} Examples:   ${pc.cyan("https://github.com/assistant-ui/mcp-app-studio-starter")}`,
  );
  if (config.includeServer) {
    p.log.message(
      `  ${pc.dim("•")} MCP Guide:  ${pc.cyan("https://modelcontextprotocol.io/quickstart")}`,
    );
  }
  p.log.message("");

  p.outro(pc.green("Happy building! 🚀"));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
