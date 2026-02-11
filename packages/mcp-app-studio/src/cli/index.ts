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
  filterTemplateTarEntry,
  getGithubArchiveTarballUrl,
} from "./template-utils";
import { validateTemplateDir } from "./template-validation";
import {
  isValidPackageName,
  isValidProjectPath,
  toValidPackageName,
  isEmpty,
  emptyDir,
  updatePackageJson,
  detectPackageManager,
} from "./utils";
import { getVersionFromCliDir } from "./version";
import { updateWorkbenchIndex } from "./workbench-index";
import {
  hasOverlayTemplates,
  applyOverlayTemplate,
  listOverlayTemplateIds,
} from "./overlay-template";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_REPO =
  process.env["MCP_APP_STUDIO_TEMPLATE_REPO"] ??
  "assistant-ui/mcp-app-studio-starter";
const TEMPLATE_REF =
  process.env["MCP_APP_STUDIO_TEMPLATE_REF"] ??
  process.env["MCP_APP_STUDIO_TEMPLATE_BRANCH"] ??
  "main";

const DOCS_URL =
  "https://github.com/assistant-ui/assistant-ui/tree/main/packages/mcp-app-studio";
const EXAMPLES_URL = "https://github.com/assistant-ui/mcp-app-studio-starter";

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
  return getVersionFromCliDir(__dirname);
}

function showHelp(): void {
  console.log(`
mcp-app-studio v${getVersion()}

Create interactive apps for MCP hosts (including ChatGPT and Claude Desktop).

${pc.bold("Requirements:")}
  Node.js >=${REQUIRED_NODE_VERSION.major}.${REQUIRED_NODE_VERSION.minor}.${REQUIRED_NODE_VERSION.patch}

${pc.bold("Usage:")}
  npx mcp-app-studio [project-name] [options]

${pc.bold("Options:")}
  --help, -h              Show this help message
  --version, -v           Show version number
  -y, --yes               Non-interactive mode (use defaults or flag values)
  --template <id>         Template ID from the starter repo (default: minimal)
  --include-server        Include MCP server (default: true)
  --no-server             Do not include MCP server
  --description <text>    App description

${pc.bold("Examples:")}
  npx mcp-app-studio my-app
  npx mcp-app-studio .          ${pc.dim("# Use current directory")}
  npx mcp-app-studio my-app -y --template poi-map --include-server

${pc.bold("Learn more:")}
  Documentation: ${DOCS_URL}
  Examples:      ${EXAMPLES_URL}
`);
}

function quotePath(p: string): string {
  if (!/[ $`"'\\&|;<>(){}[\]*?!#~]/.test(p)) {
    return p;
  }
  return `'${p.replace(/'/g, "'\\''")}'`;
}

type LegacyTemplateType = "minimal" | "poi-map";

const LEGACY_TEMPLATES = ["minimal", "poi-map"] as const;

function isLegacyTemplate(template: string): template is LegacyTemplateType {
  return (LEGACY_TEMPLATES as readonly string[]).includes(template);
}

const TEMPLATE_COMPONENTS: Record<LegacyTemplateType, string[]> = {
  minimal: ["welcome"],
  "poi-map": ["poi-map"],
};

const TEMPLATE_EXPORT_CONFIG: Record<
  LegacyTemplateType,
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

const TEMPLATE_DEFAULT_COMPONENT: Record<LegacyTemplateType, string> = {
  minimal: "welcome",
  "poi-map": "poi-map",
};

function writeStudioConfig(
  targetDir: string,
  appName: string,
  exportConfig: { entryPoint: string; exportName: string },
): void {
  const config = {
    widget: {
      entryPoint: exportConfig.entryPoint,
      exportName: exportConfig.exportName,
      name: appName,
    },
  };
  fs.writeFileSync(
    path.join(targetDir, "mcp-app-studio.config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
  );
}

function updateServerPackageName(
  targetDir: string,
  projectPackageName: string,
): void {
  const serverPkgPath = path.join(targetDir, "server", "package.json");
  if (!fs.existsSync(serverPkgPath)) return;

  const raw = fs.readFileSync(serverPkgPath, "utf-8");
  const pkg = JSON.parse(raw) as Record<string, unknown>;

  const baseName = projectPackageName.includes("/")
    ? projectPackageName.split("/").pop()
    : projectPackageName;

  if (!baseName) return;
  pkg["name"] = `${baseName}-mcp-server`;
  fs.writeFileSync(serverPkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
}

function ensureServerPostinstall(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const serverPkgPath = path.join(targetDir, "server", "package.json");
  if (!fs.existsSync(pkgPath) || !fs.existsSync(serverPkgPath)) return;

  const raw = fs.readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(raw) as Record<string, unknown>;
  const scripts = (pkg["scripts"] as Record<string, string>) ?? {};

  // If the template already defines a postinstall hook, don't override it.
  if (scripts["postinstall"]) return;

  const scriptPath = path.join(
    targetDir,
    "scripts",
    "mcp-app-studio-postinstall.cjs",
  );
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  fs.writeFileSync(
    scriptPath,
    `/* eslint-disable */\n` +
      `const { spawnSync } = require("node:child_process");\n` +
      `const { existsSync } = require("node:fs");\n` +
      `const { join } = require("node:path");\n\n` +
      `const ROOT = process.cwd();\n` +
      `const SERVER_DIR = join(ROOT, "server");\n\n` +
      `if (!existsSync(join(SERVER_DIR, "package.json"))) process.exit(0);\n` +
      `if (existsSync(join(SERVER_DIR, "node_modules")) || existsSync(join(SERVER_DIR, ".pnp.cjs"))) process.exit(0);\n\n` +
      `const ua = process.env.npm_config_user_agent || "";\n` +
      `let pm = "npm";\n` +
      `if (ua.includes("pnpm")) pm = "pnpm";\n` +
      `else if (ua.includes("yarn")) pm = "yarn";\n` +
      `else if (ua.includes("bun")) pm = "bun";\n\n` +
      `console.log("\\n\\x1b[2mInstalling server dependencies (" + pm + ")...\\x1b[0m\\n");\n` +
      `const result = spawnSync(pm, ["install"], { cwd: SERVER_DIR, stdio: "inherit", shell: process.platform === "win32" });\n` +
      `process.exit(result.status == null ? 1 : result.status);\n`,
    "utf-8",
  );

  scripts["postinstall"] = "node scripts/mcp-app-studio-postinstall.cjs";
  pkg["scripts"] = scripts;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
}

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
        "This is your MCP App. Edit this component to build something amazing.",
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
  if (!fs.existsSync(exportScriptPath)) return;

  let content = fs.readFileSync(exportScriptPath, "utf-8");

  // Newer templates read defaults from `mcp-app-studio.config.json`.
  // Avoid brittle regex patching when the export script is config-driven.
  if (content.includes("mcp-app-studio.config.json")) return;

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

function applyTemplate(targetDir: string, template: LegacyTemplateType): void {
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
  includeServer: boolean;
}

function copyDirContents(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirContents(srcPath, destPath);
      continue;
    }

    if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }

    // Skip symlinks and other special file types for safety.
  }
}

async function downloadTemplateToTemp(): Promise<{
  tempDir: string;
  templateDir: string;
}> {
  const tarballUrl = getGithubArchiveTarballUrl(TEMPLATE_REPO, TEMPLATE_REF);
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "mcp-app-studio-template-"),
  );
  const tarballPath = path.join(tempDir, "template.tar.gz");
  const extractDir = path.join(tempDir, "extract");

  try {
    fs.mkdirSync(extractDir, { recursive: true });

    // Download the tarball
    const response = await fetch(tarballUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download template from ${tarballUrl}: ${response.status} ${response.statusText}`,
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
    await extract({
      file: tarballPath,
      cwd: extractDir,
      strip: 0,
      filter: (entryPath, entry) =>
        filterTemplateTarEntry(extractDir, entryPath, entry),
    });

    const topLevelDirs = fs
      .readdirSync(extractDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    if (topLevelDirs.length !== 1) {
      throw new Error(
        `Unexpected template archive layout. Expected a single top-level directory, found ${topLevelDirs.length}.`,
      );
    }

    const topLevelDir = topLevelDirs[0];
    if (!topLevelDir) {
      throw new Error(
        "Unexpected template archive layout. No top-level directory found.",
      );
    }

    const templateDir = path.join(extractDir, topLevelDir.name);
    validateTemplateDir(templateDir);
    return { tempDir, templateDir };
  } catch (err) {
    // Best-effort cleanup on failure; on success the caller cleans up after copy.
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    throw err;
  }
}

interface ParsedArgs {
  projectName?: string;
  yes: boolean;
  template?: string;
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
        if (next && !next.startsWith("-")) {
          parsed.template = next;
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
      placeholder: "An MCP app that helps users...",
      initialValue: "",
    });
  }

  if (p.isCancel(description)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  let template: string | symbol;
  if (parsedArgs.template !== undefined) {
    template = parsedArgs.template;
  } else if (nonInteractive) {
    template = "minimal";
  } else {
    template = await p.text({
      message: "Template ID:",
      placeholder: "minimal",
      initialValue: "minimal",
      validate: (value): string | undefined => {
        if (!value) return "Template ID is required";
        return undefined;
      },
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
    includeServer: includeServer as boolean,
  };
  const requestedTemplate = template as string;

  const targetNotEmpty = !isEmpty(targetDir);
  let shouldOverwrite = false;

  if (targetNotEmpty) {
    if (nonInteractive) {
      // In non-interactive mode, overwrite without prompting
      shouldOverwrite = true;
    } else {
      const overwrite = await p.confirm({
        message: `Directory "${projectName}" is not empty. Remove existing files?`,
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel("Operation cancelled.");
        process.exit(0);
      }

      shouldOverwrite = true;
    }
  }

  const s = p.spinner();
  s.start("Downloading template...");

  let downloaded: { tempDir: string; templateDir: string } | undefined;

  try {
    downloaded = await downloadTemplateToTemp();
  } catch (error) {
    s.stop("Download failed");
    p.log.error(
      `Failed to download template: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  s.message("Creating project...");

  try {
    if (!downloaded) {
      throw new Error(
        "Internal error: template download did not return a result",
      );
    }

    // Only modify the target directory after we have a fully downloaded & validated template.
    if (shouldOverwrite) {
      // Avoid deleting the directory itself (especially dangerous for `.`).
      // Instead, remove its contents while preserving `.git/`.
      emptyDir(targetDir);
    }

    fs.mkdirSync(targetDir, { recursive: true });
    copyDirContents(downloaded.templateDir, targetDir);
  } finally {
    if (downloaded?.tempDir) {
      fs.rmSync(downloaded.tempDir, { recursive: true, force: true });
    }
  }

  updatePackageJson(targetDir, config.packageName, config.description, {
    mcpAppStudioVersion: getVersion(),
  });
  if (config.includeServer) {
    ensureServerPostinstall(targetDir);
  }

  s.message("Applying template...");
  if (hasOverlayTemplates(targetDir)) {
    const availableTemplates = listOverlayTemplateIds(targetDir);
    if (availableTemplates.length === 0) {
      throw new Error(
        "Starter repo contains templates/ but no template overlays were found.",
      );
    }
    if (!availableTemplates.includes(requestedTemplate)) {
      throw new Error(
        `Template "${requestedTemplate}" is not available in this starter repo. Available templates: ${availableTemplates.join(", ")}`,
      );
    }

    const manifest = applyOverlayTemplate(targetDir, requestedTemplate);
    writeStudioConfig(
      targetDir,
      path.basename(targetDir),
      manifest.exportConfig,
    );
  } else {
    // Legacy codegen path — kept for backward compat with older starter repos
    if (!isLegacyTemplate(requestedTemplate)) {
      throw new Error(
        `Template "${requestedTemplate}" is not supported by this legacy starter repo. Supported templates: ${LEGACY_TEMPLATES.join(", ")}`,
      );
    }

    applyTemplate(targetDir, requestedTemplate);
    writeStudioConfig(
      targetDir,
      path.basename(targetDir),
      TEMPLATE_EXPORT_CONFIG[requestedTemplate],
    );
  }

  if (config.includeServer) {
    updateServerPackageName(targetDir, config.packageName);
  } else {
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
      `${pc.cyan("server/")}               ${pc.dim("← MCP server for Claude Desktop and other MCP hosts")}`,
    );
  }
  p.note(structureGuide.join("\n"), "Project structure");

  // Key commands
  const keyCommands: string[] = [];
  keyCommands.push(
    `${pc.cyan(`${runCmd} dev`)}      ${pc.dim("Start the development workbench")}`,
  );
  keyCommands.push(
    `${pc.cyan(`${runCmd} export`)}   ${pc.dim("Build & export app bundle + manifest")}`,
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
    `  ${pc.dim("•")} Use ${pc.cyan("useFeature('widgetState')")} to check for optional ChatGPT extensions`,
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
  p.log.message(`  ${pc.dim("•")} SDK Docs:   ${pc.cyan(DOCS_URL)}`);
  p.log.message(`  ${pc.dim("•")} Examples:   ${pc.cyan(EXAMPLES_URL)}`);
  if (config.includeServer) {
    p.log.message(
      `  ${pc.dim("•")} MCP Guide:  ${pc.cyan("https://modelcontextprotocol.io/quickstart")}`,
    );
    p.log.message(
      `  ${pc.dim("•")} ChatGPT Submission: ${pc.cyan("https://platform.openai.com/apps")}`,
    );
    p.log.message(
      `  ${pc.dim("•")} Claude Submission:  ${pc.cyan("https://support.claude.com/en/articles/12922490-remote-mcp-server-submission-guide")}`,
    );
  }
  p.log.message("");

  p.outro(pc.green("Happy building! 🚀"));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
