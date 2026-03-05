import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "cross-spawn";
import { sync as globSync } from "glob";
import { detect } from "detect-package-manager";
import { logger } from "./utils/logger";

export interface TransformOptions {
  hasLocalComponents: boolean;
  skipInstall?: boolean;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun" | undefined;
}

export async function resolveLatestReleaseSha(): Promise<string | undefined> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/assistant-ui/assistant-ui/tags?per_page=1",
    );
    if (!res.ok) return undefined;
    const tags = (await res.json()) as Array<{
      commit: { sha: string };
    }>;
    return tags[0]?.commit.sha;
  } catch {
    return undefined;
  }
}

export async function downloadProject(
  repoPath: string,
  destDir: string,
  sha?: string,
): Promise<void> {
  const degitRef = sha
    ? `assistant-ui/assistant-ui/${repoPath}#${sha}`
    : `assistant-ui/assistant-ui/${repoPath}`;

  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--yes", "degit", degitRef, destDir, "--force"],
      {
        stdio: "inherit",
        shell: true,
      },
    );

    child.on("error", (error) => {
      reject(new Error(`Failed to download project: ${error.message}`));
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

export async function transformProject(
  projectDir: string,
  opts: TransformOptions,
): Promise<void> {
  // 1. Transform package.json (always)
  logger.step("Transforming package.json...");
  await transformPackageJson(projectDir);

  let assistantUI: string[] | undefined;
  let shadcnUI: string[] | undefined;

  if (!opts.hasLocalComponents) {
    // 2. Transform tsconfig.json
    logger.step("Transforming tsconfig.json...");
    await transformTsConfig(projectDir);

    // 3. Transform CSS files
    logger.step("Transforming CSS files...");
    await transformCssFiles(projectDir);

    // 4. Scan for required components
    logger.step("Scanning for required components...");
    const components = await scanRequiredComponents(projectDir);
    assistantUI = components.assistantUI;
    shadcnUI = components.shadcnUI;

    // 5. Remove workspace components directory
    logger.step("Cleaning up workspace components...");
    await removeWorkspaceComponents(projectDir);
  }

  // 6. Install dependencies
  if (!opts.skipInstall) {
    logger.step("Installing dependencies...");
    await installDependencies(projectDir, opts.packageManager);
  }

  if (!opts.hasLocalComponents && shadcnUI && assistantUI) {
    // 7. Install shadcn UI components
    if (!shadcnUI.includes("utils")) {
      shadcnUI.push("utils");
    }
    logger.step(`Installing shadcn UI components: ${shadcnUI.join(", ")}...`);
    await installShadcnComponents(projectDir, shadcnUI);

    // 8. Install assistant-ui components
    if (assistantUI.length > 0) {
      logger.step(
        `Installing assistant-ui components: ${assistantUI.join(", ")}...`,
      );
      await installAssistantUIComponents(projectDir, assistantUI);
    }
  }
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
    delete tsconfig.compilerOptions.paths["@/components/ui/*"];
    delete tsconfig.compilerOptions.paths["@/lib/utils"];
    delete tsconfig.compilerOptions.paths["@assistant-ui/ui/*"];
  }

  // If extends uses @assistant-ui/x-buildutils, replace with inline config
  if (tsconfig.extends?.includes("@assistant-ui/x-buildutils")) {
    delete tsconfig.extends;

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

async function transformCssFiles(projectDir: string): Promise<void> {
  const cssFiles = globSync("**/*.css", {
    cwd: projectDir,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  });

  for (const file of cssFiles) {
    const fullPath = path.join(projectDir, file);
    try {
      let content = fs.readFileSync(fullPath, "utf-8");

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

      const assistantUIRegex =
        /from\s+["']@\/components\/assistant-ui\/([^"']+)["']/g;
      let match;
      while ((match = assistantUIRegex.exec(content)) !== null) {
        assistantUIComponents.add(match[1]!);
      }

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

async function installDependencies(
  projectDir: string,
  packageManager?: string,
): Promise<void> {
  let pm: string;

  if (packageManager) {
    pm = packageManager;
  } else {
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

async function installShadcnComponents(
  projectDir: string,
  components: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--yes", "shadcn@latest", "add", ...components, "--yes"],
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
        logger.warn(
          `shadcn exited with code ${code}, components may need manual installation`,
        );
      }
      resolve();
    });
  });
}

async function installAssistantUIComponents(
  projectDir: string,
  components: string[],
): Promise<void> {
  const componentArgs = components.map((c) => `@assistant-ui/${c}`);

  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--yes", "shadcn@latest", "add", ...componentArgs, "--yes"],
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
        logger.warn(
          `shadcn exited with code ${code}, components may need manual installation`,
        );
      }
      resolve();
    });
  });
}
