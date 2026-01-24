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
  "with-assistant-transport",
  "with-cloud",
  "with-custom-thread-list",
  "with-elevenlabs-scribe",
  "with-external-store",
  "with-ffmpeg",
  "with-langgraph",
  "with-parent-id-grouping",
  "with-react-hook-form",
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

  // 5. Scan for required components
  logger.step("Scanning for required components...");
  const components = await scanRequiredComponents(absoluteProjectDir);

  // 6. Remove workspace components directory
  logger.step("Cleaning up workspace components...");
  await removeWorkspaceComponents(absoluteProjectDir);

  // 7. Install dependencies first (needed for shadcn)
  if (!opts.skipInstall) {
    logger.step("Installing dependencies...");
    await installDependencies(absoluteProjectDir, opts);
  }

  // 8. Install shadcn components
  if (components.length > 0) {
    logger.step(`Installing shadcn components: ${components.join(", ")}...`);
    await installComponents(absoluteProjectDir, components, opts);
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

async function scanRequiredComponents(projectDir: string): Promise<string[]> {
  const files = globSync("**/*.{ts,tsx}", {
    cwd: projectDir,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  });

  const components = new Set<string>();

  for (const file of files) {
    const fullPath = path.join(projectDir, file);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");

      // Match imports from "@/components/assistant-ui/xxx"
      const importRegex =
        /from\s+["']@\/components\/assistant-ui\/([^"']+)["']/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        components.add(match[1]!);
      }
    } catch {
      // Ignore files that cannot be read
    }
  }

  return Array.from(components);
}

async function removeWorkspaceComponents(projectDir: string): Promise<void> {
  const componentsDir = path.join(projectDir, "components", "assistant-ui");

  if (fs.existsSync(componentsDir)) {
    fs.rmSync(componentsDir, { recursive: true });
  }
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
