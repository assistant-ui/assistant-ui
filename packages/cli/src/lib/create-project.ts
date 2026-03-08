import * as fs from "node:fs";
import * as path from "node:path";
import { downloadTemplate } from "giget";
import { spawn } from "cross-spawn";
import { sync as globSync } from "glob";
import { detect } from "detect-package-manager";
import { logger } from "./utils/logger";

export type PackageManagerName = "npm" | "pnpm" | "yarn" | "bun";

export function dlxCommand(pm: PackageManagerName): [string, string[]] {
  switch (pm) {
    case "pnpm":
      return ["pnpm", ["dlx"]];
    case "yarn":
      return ["yarn", ["dlx"]];
    case "bun":
      return ["bunx", []];
    case "npm":
      return ["npx", ["--yes"]];
  }
}

export interface TransformOptions {
  hasLocalComponents: boolean;
  skipInstall?: boolean;
  packageManager?: PackageManagerName;
}

export async function resolveLatestReleaseRef(): Promise<string | undefined> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/assistant-ui/assistant-ui/releases/latest",
    );
    if (!res.ok) return undefined;
    const release = (await res.json()) as { tag_name: string };
    return release.tag_name || undefined;
  } catch {
    return undefined;
  }
}

const DOWNLOAD_TIMEOUT_MS = 30_000;

export async function downloadProject(
  repoPath: string,
  destDir: string,
  ref?: string,
): Promise<void> {
  const source = ref
    ? `gh:assistant-ui/assistant-ui/${repoPath}#${ref}`
    : `gh:assistant-ui/assistant-ui/${repoPath}`;

  // Suppress giget's console.debug output
  const origDebug = console.debug;
  console.debug = () => {};
  try {
    const downloadPromise = downloadTemplate(source, {
      dir: destDir,
      force: true,
      silent: true,
    });

    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              "Download timed out. This may be due to GitHub rate limiting or a network issue. Try again in a few minutes.",
            ),
          ),
        DOWNLOAD_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([downloadPromise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  } finally {
    console.debug = origDebug;
  }
}

export async function resolvePackageManagerName(
  projectDir: string,
  packageManager?: PackageManagerName,
): Promise<PackageManagerName> {
  if (packageManager) return packageManager;
  try {
    return await detect({ cwd: path.dirname(projectDir) });
  } catch {
    return "npm";
  }
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
    logger.step("Transforming project files...");

    // 2–5. Transform tsconfig, CSS, scan components, and remove workspace
    // components — all independent, run in parallel
    const [, , components] = await Promise.all([
      transformTsConfig(projectDir),
      transformCssFiles(projectDir),
      scanRequiredComponents(projectDir),
      removeWorkspaceComponents(projectDir),
    ]);
    assistantUI = components.assistantUI;
    shadcnUI = components.shadcnUI;
  }

  // 6. Install dependencies
  const pm =
    opts.packageManager ?? (await resolvePackageManagerName(projectDir));
  if (!opts.skipInstall) {
    logger.step("Installing dependencies...");
    await installDependencies(projectDir, pm);
  }

  if (!opts.hasLocalComponents && shadcnUI && assistantUI) {
    // 7. Install shadcn UI components
    const allShadcn = shadcnUI.includes("utils")
      ? shadcnUI
      : [...shadcnUI, "utils"];
    logger.step(`Installing shadcn UI components: ${allShadcn.join(", ")}...`);
    await installShadcnRegistry(projectDir, allShadcn, "shadcn components", pm);

    // 8. Install assistant-ui components
    if (assistantUI.length > 0) {
      const auiComponents = assistantUI.map((c) => `@assistant-ui/${c}`);
      logger.step(
        `Installing assistant-ui components: ${assistantUI.join(", ")}...`,
      );
      await installShadcnRegistry(projectDir, auiComponents, "components", pm);
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

    if (Object.keys(tsconfig.compilerOptions.paths).length === 0) {
      delete tsconfig.compilerOptions.paths;
    }
  }

  // If extends uses @assistant-ui/x-buildutils, replace with inline config
  if (tsconfig.extends?.includes("@assistant-ui/x-buildutils")) {
    const isNext = tsconfig.extends.includes("ts/next");
    delete tsconfig.extends;

    const inlinedCompilerOptions = {
      target: "ESNext",
      lib: ["dom", "dom.iterable", "ES2023"],
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "ESNext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "react-jsx",
      ...(isNext ? { plugins: [{ name: "next" }] } : {}),
    };

    tsconfig.compilerOptions = {
      ...inlinedCompilerOptions,
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
  fs.rmSync(componentsDir, { recursive: true, force: true });
}

async function installDependencies(
  projectDir: string,
  pm: PackageManagerName,
): Promise<void> {
  const args = pm === "yarn" ? [] : ["install"];

  return new Promise((resolve, reject) => {
    const child = spawn(pm, args, {
      cwd: projectDir,
      stdio: "inherit",
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

async function installShadcnRegistry(
  projectDir: string,
  components: string[],
  label: string,
  pm: PackageManagerName,
): Promise<void> {
  const [cmd, dlxArgs] = dlxCommand(pm);
  return new Promise((resolve, reject) => {
    const child = spawn(
      cmd,
      [...dlxArgs, "shadcn@latest", "add", ...components, "--yes"],
      {
        cwd: projectDir,
        stdio: "inherit",
      },
    );

    child.on("error", (error) => {
      reject(new Error(`Failed to install ${label}: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        logger.warn(
          `shadcn exited with code ${code}. Run the following to retry:\n  ${cmd} ${[...dlxArgs, "shadcn@latest", "add", ...components].join(" ")}`,
        );
      }
      resolve();
    });
  });
}
