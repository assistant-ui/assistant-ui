import * as fs from "node:fs";
import * as path from "node:path";
import { downloadTemplate } from "giget";
import { sync as globSync } from "glob";
import { detect } from "detect-package-manager";
import { logger } from "./utils/logger";
import { runSpawn, SpawnExitError } from "./run-spawn";

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
  packageManager: PackageManagerName;
}

export type ProjectSource =
  | {
      kind: "github";
      ref: string | undefined;
    }
  | {
      kind: "local";
      rootDir: string;
    };

const LOCAL_PROJECT_ARTIFACT_DIRS: readonly string[] = [
  "node_modules",
  ".next",
  "dist",
  "build",
];

const LOCAL_PROJECT_ARTIFACT_GLOB_IGNORES = LOCAL_PROJECT_ARTIFACT_DIRS.map(
  (dir) => `**/${dir}/**`,
);

export function resolvePackageManager(opts: {
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  useBun?: boolean;
}): PackageManagerName | undefined {
  if (opts.useNpm) return "npm";
  if (opts.usePnpm) return "pnpm";
  if (opts.useYarn) return "yarn";
  if (opts.useBun) return "bun";
  return undefined;
}

function resolveGitHubAuthToken(): string | undefined {
  const token =
    process.env.GIGET_AUTH ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const trimmed = token?.trim();
  return trimmed || undefined;
}

function toBearerAuthHeader(token: string): string {
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
}

export async function resolveLatestReleaseRef(): Promise<string | undefined> {
  try {
    const authToken = resolveGitHubAuthToken();
    const res = await fetch(
      "https://api.github.com/repos/assistant-ui/assistant-ui/releases/latest",
      authToken
        ? { headers: { Authorization: toBearerAuthHeader(authToken) } }
        : undefined,
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

  // Suppress giget's debug output. The `debug` package (used by the upgrade
  // command) sets process.env.DEBUG at module-load time, and giget logs to
  // console.debug whenever that env var is truthy — even for unrelated
  // namespaces. Temporarily unsetting it targets the root cause.
  const origDebug = process.env.DEBUG;
  delete process.env.DEBUG;
  try {
    const authToken = resolveGitHubAuthToken();
    const downloadPromise = downloadTemplate(source, {
      dir: destDir,
      force: true,
      silent: true,
      ...(authToken ? { auth: authToken } : {}),
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
    if (origDebug !== undefined) {
      process.env.DEBUG = origDebug;
    }
  }
}

function shouldCopyLocalProjectPath(src: string, projectDir: string): boolean {
  const relative = path.relative(projectDir, src);
  if (!relative) return true;

  const segments = relative.split(path.sep);
  return !segments.some((segment) =>
    LOCAL_PROJECT_ARTIFACT_DIRS.includes(segment),
  );
}

export async function scaffoldProject(
  repoPath: string,
  destDir: string,
  source: ProjectSource,
): Promise<void> {
  if (source.kind === "github") {
    await downloadProject(repoPath, destDir, source.ref);
    return;
  }

  const localProjectDir = path.resolve(source.rootDir, repoPath);
  try {
    fs.cpSync(localProjectDir, destDir, {
      recursive: true,
      force: true,
      filter: (src) => shouldCopyLocalProjectPath(src, localProjectDir),
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      throw new Error(
        `Local project source does not exist: ${localProjectDir}`,
      );
    }
    throw error;
  }
}

function detectFromUserAgent(): PackageManagerName | undefined {
  const ua = process.env.npm_config_user_agent;
  if (!ua) return undefined;
  if (ua.startsWith("bun/")) return "bun";
  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("npm/")) return "npm";
  return undefined;
}

export async function resolvePackageManagerForCwd(
  cwd: string,
  packageManager?: PackageManagerName,
): Promise<PackageManagerName> {
  if (packageManager) return packageManager;
  const fromAgent = detectFromUserAgent();
  if (fromAgent) return fromAgent;
  try {
    return await detect({ cwd });
  } catch {
    return "npm";
  }
}

export async function transformProject(
  projectDir: string,
  opts: TransformOptions,
): Promise<void> {
  logger.step("Transforming package.json...");
  transformPackageJson(projectDir);

  let assistantUI: string[] | undefined;
  let shadcnUI: string[] | undefined;

  if (!opts.hasLocalComponents) {
    logger.step("Transforming project files...");

    transformTsConfig(projectDir);
    transformCssFiles(projectDir);

    const components = scanRequiredComponents(projectDir);
    assistantUI = components.assistantUI;
    shadcnUI = components.shadcnUI;
  }

  const pm = opts.packageManager;
  if (!opts.skipInstall) {
    logger.step("Installing dependencies...");
    await installDependencies(projectDir, pm);
  }

  if (!opts.hasLocalComponents && shadcnUI && assistantUI) {
    const allShadcn = shadcnUI.includes("utils")
      ? shadcnUI
      : [...shadcnUI, "utils"];
    const auiComponents = assistantUI.map((c) => `@assistant-ui/${c}`);
    const components = [...allShadcn, ...auiComponents];
    logger.step(`Installing components: ${components.join(", ")}...`);
    await installShadcnRegistry(projectDir, components, "components", pm);
  }
}

function transformPackageJson(projectDir: string): void {
  const pkgPath = path.join(projectDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  // Remove @assistant-ui/ui dependency
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

function transformTsConfig(projectDir: string): void {
  const tsconfigPath = path.join(projectDir, "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    return;
  }

  const content = fs.readFileSync(tsconfigPath, "utf-8");
  const tsconfig = JSON.parse(content);

  // Remove workspace paths
  if (tsconfig.compilerOptions?.paths) {
    delete tsconfig.compilerOptions.paths["@/components/assistant-ui/*"];
    delete tsconfig.compilerOptions.paths["@/components/icons/*"];
    delete tsconfig.compilerOptions.paths["@/components/ui/*"];
    delete tsconfig.compilerOptions.paths["@/hooks/*"];
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

function transformCssFiles(projectDir: string): void {
  const cssFiles = globSync("**/*.css", {
    cwd: projectDir,
    ignore: LOCAL_PROJECT_ARTIFACT_GLOB_IGNORES,
  });

  for (const file of cssFiles) {
    const fullPath = path.join(projectDir, file);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");

      const newContent = content.replace(
        /@source\s+["'][^"']*packages\/ui\/src[^"']*["'];\s*\n?/g,
        "",
      );

      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
      }
    } catch {
      // Ignore files that cannot be read/written
    }
  }
}

interface RequiredComponents {
  assistantUI: string[];
  shadcnUI: string[];
}

function stripImportExtension(component: string): string {
  return component.replace(/\.[cm]?[tj]sx?$/, "");
}

function scanRequiredComponents(projectDir: string): RequiredComponents {
  const files = globSync("**/*.{ts,tsx}", {
    cwd: projectDir,
    ignore: LOCAL_PROJECT_ARTIFACT_GLOB_IGNORES,
  });

  const assistantUIComponents = new Set<string>();
  const shadcnUIComponents = new Set<string>();

  for (const file of files) {
    const fullPath = path.join(projectDir, file);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");

      const assistantUIRegex =
        /from\s+["']@\/components\/assistant-ui\/([^"']+)["']/g;
      for (const match of content.matchAll(assistantUIRegex)) {
        assistantUIComponents.add(stripImportExtension(match[1]!));
      }

      const uiRegex = /from\s+["']@\/components\/ui\/([^"']+)["']/g;
      for (const match of content.matchAll(uiRegex)) {
        shadcnUIComponents.add(stripImportExtension(match[1]!));
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

async function installDependencies(
  projectDir: string,
  pm: PackageManagerName,
): Promise<void> {
  const args = pm === "yarn" ? [] : ["install"];
  try {
    await runSpawn(pm, args, projectDir);
  } catch (error) {
    if (error instanceof SpawnExitError) {
      throw new Error(`${pm} install exited with code ${error.code}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to install dependencies: ${message}`);
  }
}

async function installShadcnRegistry(
  projectDir: string,
  components: string[],
  label: string,
  pm: PackageManagerName,
): Promise<void> {
  const [cmd, dlxArgs] = dlxCommand(pm);
  // For npm, dlxArgs may already include `--yes` for npx auto-install.
  // The trailing `--yes` is for shadcn's own confirmation prompt.
  const addArgs = [...dlxArgs, "shadcn@latest", "add", ...components, "--yes"];

  try {
    await runSpawn(cmd, addArgs, projectDir);
  } catch (error) {
    if (error instanceof SpawnExitError) {
      logger.warn(
        `shadcn exited with code ${error.code}. Run the following to retry:\n  ${cmd} ${addArgs.slice(0, -1).join(" ")}`,
      );
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to install ${label}: ${message}`);
  }
}
