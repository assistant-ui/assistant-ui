import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { sync as globSync } from "glob";
import { detect } from "detect-package-manager";
import { logger } from "./utils/logger";

export interface CreateFromExampleOptions {
  skipInstall?: boolean;
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  useBun?: boolean;
}

const VALID_EXAMPLES = [
  "with-ag-ui",
  "with-ai-sdk-v6",
  "with-artifacts",
  "with-assistant-transport",
  "with-chain-of-thought",
  "with-cloud",
  "with-custom-thread-list",
  "with-elevenlabs-scribe",
  "with-external-store",
  "with-ffmpeg",
  "with-langgraph",
  "with-parent-id-grouping",
  "with-react-hook-form",
  "with-react-router",
  "with-tanstack",
];

export async function createFromExample(
  projectDir: string,
  exampleName: string,
  opts: CreateFromExampleOptions,
): Promise<void> {
  // 1. Validate example name
  if (!VALID_EXAMPLES.includes(exampleName)) {
    logger.error(`Unknown example: ${exampleName}`);
    logger.info(`Available examples: ${VALID_EXAMPLES.join(", ")}`);
    process.exit(1);
  }

  const absoluteProjectDir = path.resolve(projectDir);

  // Check if directory already exists
  if (fs.existsSync(absoluteProjectDir)) {
    const files = fs.readdirSync(absoluteProjectDir);
    if (files.length > 0) {
      logger.error(`Directory ${projectDir} already exists and is not empty`);
      process.exit(1);
    }
  }

  logger.info(`Creating project from example: ${exampleName}`);
  logger.break();

  // 2. Download example using degit
  logger.step("Downloading example...");
  await downloadExample(exampleName, absoluteProjectDir);

  // 3. Transform package.json
  logger.step("Transforming package.json...");
  await transformPackageJson(absoluteProjectDir);

  // 4. Transform tsconfig.json
  logger.step("Transforming tsconfig.json...");
  await transformTsConfig(absoluteProjectDir);

  // 5. Transform CSS files (remove monorepo-specific @source directives)
  logger.step("Transforming CSS files...");
  await transformCssFiles(absoluteProjectDir);

  // 6. Scan for required components
  logger.step("Scanning for required components...");
  const { assistantUI, shadcnUI } =
    await scanRequiredComponents(absoluteProjectDir);

  // 7. Remove workspace components directory
  logger.step("Cleaning up workspace components...");
  await removeWorkspaceComponents(absoluteProjectDir);

  // 8. Install dependencies first (needed for shadcn)
  if (!opts.skipInstall) {
    logger.step("Installing dependencies...");
    await installDependencies(absoluteProjectDir, opts);
  }

  // 9. Install shadcn UI components (standard shadcn components like button, tooltip, etc.)
  //    Always include "utils" since assistant-ui components import cn from @/lib/utils
  //    and shadcn does not declare it as a registryDependency of button/tooltip/etc.
  if (!shadcnUI.includes("utils")) {
    shadcnUI.push("utils");
  }
  logger.step(`Installing shadcn UI components: ${shadcnUI.join(", ")}...`);
  await installShadcnComponents(absoluteProjectDir, shadcnUI);

  // 10. Install assistant-ui components
  if (assistantUI.length > 0) {
    logger.step(
      `Installing assistant-ui components: ${assistantUI.join(", ")}...`,
    );
    await installComponents(absoluteProjectDir, assistantUI, opts);
  }

  logger.break();
  logger.success("Project created successfully!");
  logger.break();
  logger.info("Next steps:");
  logger.info(`  cd ${projectDir}`);
  if (opts.skipInstall) {
    logger.info("  npm install");
  }
  logger.info("  # Set up your environment variables in .env.local");
  logger.info("  npm run dev");
}

async function downloadExample(
  exampleName: string,
  destDir: string,
): Promise<void> {
  const degitPath = `assistant-ui/assistant-ui/examples/${exampleName}`;

  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["degit", degitPath, destDir, "--force"], {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to download example: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`degit exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function transformPackageJson(projectDir: string): Promise<void> {
  const pkgPath = path.join(projectDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  // Remove @assistant-ui/ui (workspace-only package)
  if (pkg.dependencies?.["@assistant-ui/ui"]) {
    delete pkg.dependencies["@assistant-ui/ui"];
  }

  // Transform workspace dependencies to latest
  for (const depType of ["dependencies", "devDependencies"] as const) {
    const deps = pkg[depType];
    if (!deps) continue;

    for (const [name, version] of Object.entries(deps)) {
      if (String(version).includes("workspace:")) {
        deps[name] = "latest";
      }
    }
  }

  // Remove devDependencies that are workspace-only
  if (pkg.devDependencies?.["@assistant-ui/x-buildutils"]) {
    delete pkg.devDependencies["@assistant-ui/x-buildutils"];
  }

  // Update package name to be unique
  const dirName = path.basename(projectDir);
  pkg.name = dirName;

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

async function transformCssFiles(projectDir: string): Promise<void> {
  // Find all CSS files
  const cssFiles = globSync("**/*.css", {
    cwd: projectDir,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  });

  for (const file of cssFiles) {
    const fullPath = path.join(projectDir, file);
    try {
      let content = fs.readFileSync(fullPath, "utf-8");

      // Remove @source lines that point to monorepo packages directory
      // These are only needed in the monorepo context
      content = content.replace(
        /@source\s+["'][^"']*packages\/ui\/src[^"']*["'];\s*\n?/g,
        "",
      );

      fs.writeFileSync(fullPath, content);
    } catch {
      // Ignore files that cannot be read/written
    }
  }
}

async function transformTsConfig(projectDir: string): Promise<void> {
  const tsconfigPath = path.join(projectDir, "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    return;
  }

  const content = fs.readFileSync(tsconfigPath, "utf-8");
  const tsconfig = JSON.parse(content);

  // Remove workspace paths
  if (tsconfig.compilerOptions?.paths) {
    delete tsconfig.compilerOptions.paths["@/components/assistant-ui/*"];
    delete tsconfig.compilerOptions.paths["@/components/ui/*"];
    delete tsconfig.compilerOptions.paths["@/lib/utils"];
    delete tsconfig.compilerOptions.paths["@assistant-ui/ui/*"];

    // If paths is empty, remove it
    if (Object.keys(tsconfig.compilerOptions.paths).length === 0) {
      delete tsconfig.compilerOptions.paths;
    }
  }

  // If extends uses @assistant-ui/x-buildutils, replace with inline config
  if (tsconfig.extends?.includes("@assistant-ui/x-buildutils")) {
    delete tsconfig.extends;

    // Add necessary compiler options that were in the extended config
    tsconfig.compilerOptions = {
      ...{
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
      },
      ...tsconfig.compilerOptions,
      paths: {
        "@/*": ["./*"],
        ...(tsconfig.compilerOptions?.paths || {}),
      },
    };
  }

  fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
}

interface RequiredComponents {
  assistantUI: string[];
  shadcnUI: string[];
}

async function scanRequiredComponents(
  projectDir: string,
): Promise<RequiredComponents> {
  const files = globSync("**/*.{ts,tsx}", {
    cwd: projectDir,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  });

  const assistantUIComponents = new Set<string>();
  const shadcnUIComponents = new Set<string>();

  for (const file of files) {
    const fullPath = path.join(projectDir, file);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");

      // Match imports from "@/components/assistant-ui/xxx"
      const assistantUIRegex =
        /from\s+["']@\/components\/assistant-ui\/([^"']+)["']/g;
      let match;
      while ((match = assistantUIRegex.exec(content)) !== null) {
        assistantUIComponents.add(match[1]!);
      }

      // Match imports from "@/components/ui/xxx"
      const uiRegex = /from\s+["']@\/components\/ui\/([^"']+)["']/g;
      while ((match = uiRegex.exec(content)) !== null) {
        shadcnUIComponents.add(match[1]!);
      }
    } catch {
      // Ignore files that cannot be read
    }
  }

  return {
    assistantUI: Array.from(assistantUIComponents),
    shadcnUI: Array.from(shadcnUIComponents),
  };
}

async function removeWorkspaceComponents(projectDir: string): Promise<void> {
  const componentsDir = path.join(projectDir, "components", "assistant-ui");

  if (fs.existsSync(componentsDir)) {
    fs.rmSync(componentsDir, { recursive: true });
  }
}

async function installShadcnComponents(
  projectDir: string,
  components: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["shadcn@latest", "add", ...components, "--yes"],
      {
        cwd: projectDir,
        stdio: "inherit",
        shell: true,
      },
    );

    child.on("error", (error) => {
      reject(
        new Error(`Failed to install shadcn components: ${error.message}`),
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        // Don't fail if shadcn has issues, just warn
        logger.warn(
          `shadcn exited with code ${code}, components may need manual installation`,
        );
      }
      resolve();
    });
  });
}

async function installComponents(
  projectDir: string,
  components: string[],
  _opts: CreateFromExampleOptions,
): Promise<void> {
  // Format component names for shadcn registry
  const componentArgs = components.map((c) => `@assistant-ui/${c}`);

  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["shadcn@latest", "add", ...componentArgs, "--yes"],
      {
        cwd: projectDir,
        stdio: "inherit",
        shell: true,
      },
    );

    child.on("error", (error) => {
      reject(new Error(`Failed to install components: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        // Don't fail if shadcn has issues, just warn
        logger.warn(
          `shadcn exited with code ${code}, components may need manual installation`,
        );
      }
      resolve();
    });
  });
}

async function installDependencies(
  projectDir: string,
  opts: CreateFromExampleOptions,
): Promise<void> {
  let pm: string;

  if (opts.useNpm) {
    pm = "npm";
  } else if (opts.usePnpm) {
    pm = "pnpm";
  } else if (opts.useYarn) {
    pm = "yarn";
  } else if (opts.useBun) {
    pm = "bun";
  } else {
    // Detect from parent directory or default to npm
    try {
      pm = await detect({ cwd: path.dirname(projectDir) });
    } catch {
      pm = "npm";
    }
  }

  const args = pm === "yarn" ? [] : ["install"];

  return new Promise((resolve, reject) => {
    const child = spawn(pm, args, {
      cwd: projectDir,
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to install dependencies: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${pm} install exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}
