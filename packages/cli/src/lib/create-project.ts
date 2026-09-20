import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { downloadTemplate } from "giget";
import {
  parse as parseJsonc,
  printParseErrorCode,
  type ParseError,
} from "jsonc-parser";
import { logger } from "./utils/logger";
import { runSpawn, SpawnExitError, SpawnSignalError } from "./run-spawn";
import { type PackageManagerName } from "./utils/package-manager";
import { readProjectFiles } from "./utils/file-scanner";
import {
  detectRegistryPlatform,
  resolveRegistryItemUrl,
} from "./utils/registry";

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
const pendingDownloadCleanups = new Set<() => void>();

export function cleanupPendingProjectDownloads(): void {
  for (const cleanup of pendingDownloadCleanups) {
    pendingDownloadCleanups.delete(cleanup);
    process.removeListener("exit", cleanup);
    cleanup();
  }
}

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
  let destinationCreated = false;
  let stagingDir: string | undefined;
  let downloadPromise: Promise<unknown> | undefined;
  let downloadFinished = false;
  let downloadCommitted = false;
  let cleanupRequested = false;
  const removeCleanupListeners = () => {
    process.removeListener("exit", cleanupOnExit);
    pendingDownloadCleanups.delete(cleanupOnExit);
  };
  const attemptSyncCleanup = (cleanup: () => void) => {
    try {
      cleanup();
    } catch {
      return;
    }
  };
  const cleanupOnExit = () => {
    cleanupRequested = true;
    const currentStagingDir = stagingDir;
    if (currentStagingDir) {
      attemptSyncCleanup(() => {
        fs.rmSync(currentStagingDir, { recursive: true, force: true });
      });
    }
    if (destinationCreated && !downloadCommitted) {
      attemptSyncCleanup(() => {
        fs.rmdirSync(destDir);
      });
    }
  };
  const removeStagingDir = async () => {
    if (stagingDir) {
      await fs.promises
        .rm(stagingDir, { recursive: true, force: true })
        .catch(() => undefined);
    }
    removeCleanupListeners();
    if (destinationCreated && !downloadCommitted) {
      await fs.promises.rmdir(destDir).catch(() => undefined);
    }
  };
  try {
    await fs.promises.mkdir(path.dirname(destDir), { recursive: true });
    try {
      stagingDir = await fs.promises.mkdtemp(
        path.join(path.dirname(destDir), ".assistant-ui-download-"),
      );
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EACCES" && code !== "EPERM" && code !== "EROFS") {
        throw error;
      }
      stagingDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), ".assistant-ui-download-"),
      );
    }
    process.once("exit", cleanupOnExit);
    pendingDownloadCleanups.add(cleanupOnExit);

    const authToken = resolveGitHubAuthToken();
    downloadPromise = downloadTemplate(source, {
      dir: stagingDir,
      force: true,
      silent: true,
      ...(authToken ? { auth: authToken } : {}),
    }).finally(() => {
      downloadFinished = true;
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
      if (cleanupRequested) throw new Error("Download was interrupted.");
      destinationCreated = !fs.existsSync(destDir);
      await fs.promises.mkdir(destDir, { recursive: true });
      for (const entry of await fs.promises.readdir(stagingDir)) {
        const target = path.join(destDir, entry);
        const sourceEntry = path.join(stagingDir, entry);
        await fs.promises.rm(target, { recursive: true, force: true });
        try {
          await fs.promises.rename(sourceEntry, target);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
          await fs.promises.cp(sourceEntry, target, {
            recursive: true,
            force: true,
          });
          await fs.promises.rm(sourceEntry, { recursive: true, force: true });
        }
      }
      downloadCommitted = true;
    } finally {
      clearTimeout(timer!);
    }
  } finally {
    if (!downloadPromise || downloadFinished) {
      await removeStagingDir();
    } else {
      void downloadPromise.then(removeStagingDir, removeStagingDir);
    }
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

export interface TransformResult {
  registryInstallFailure?: { retryCommand: string };
  registryInstallCommand?: string;
}

export async function transformProject(
  projectDir: string,
  opts: TransformOptions,
): Promise<TransformResult> {
  logger.step("Transforming package.json...");
  transformPackageJson(projectDir);

  logger.step("Transforming project files...");
  transformTsConfig(projectDir);
  transformCssFiles(projectDir);

  const components = opts.hasLocalComponents
    ? undefined
    : resolveRegistryComponents(projectDir, scanRequiredComponents(projectDir));

  const pm = opts.packageManager;
  if (opts.skipInstall) {
    if (!components) return {};
    const [cmd, dlxArgs] = dlxCommand(pm);
    return {
      registryInstallCommand: `${cmd} ${[...dlxArgs, "shadcn@latest", "add", ...components].join(" ")}`,
    };
  }

  logger.step("Installing dependencies...");
  await installDependencies(projectDir, pm);

  if (components) {
    logger.step(`Installing components: ${components.join(", ")}...`);
    const failure = await installShadcnRegistry(
      projectDir,
      components,
      "components",
      pm,
    );
    if (failure) return { registryInstallFailure: failure };
    await reconcileAssistantUIImportLayout(projectDir);
  }
  return {};
}

function resolveRegistryComponents(
  projectDir: string,
  { assistantUI, shadcnUI }: RequiredComponents,
): string[] {
  if (detectRegistryPlatform(projectDir) === "native") {
    return ["utils", ...shadcnUI, ...assistantUI].map((component) =>
      resolveRegistryItemUrl(component, undefined, "native"),
    );
  }
  return [
    "@assistant-ui/utils",
    ...shadcnUI,
    ...assistantUI.map((component) => `@assistant-ui/${component}`),
  ];
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

function parseTsConfig(content: string): any {
  const errors: ParseError[] = [];
  const tsconfig = parseJsonc(content, errors, { allowTrailingComma: true });
  const error = errors[0];
  if (error) {
    throw new SyntaxError(
      `Invalid tsconfig.json: ${printParseErrorCode(error.error)} at offset ${error.offset}`,
    );
  }
  return tsconfig;
}

function transformTsConfig(projectDir: string): void {
  const tsconfigPath = path.join(projectDir, "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    return;
  }

  const content = fs.readFileSync(tsconfigPath, "utf-8");
  const tsconfig = parseTsConfig(content);

  // Remove workspace paths
  if (tsconfig.compilerOptions?.paths) {
    const workspaceKeys = new Set([
      "@/components/assistant-ui/*",
      "@/components/icons/*",
      "@/components/ui/*",
      "@/components/ui/radix/*",
      "@/hooks/*",
      "@/lib/utils",
      "@assistant-ui/ui/*",
    ]);
    for (const [key, targets] of Object.entries(
      tsconfig.compilerOptions.paths as Record<string, unknown>,
    )) {
      const targetsWorkspace =
        Array.isArray(targets) &&
        targets.some(
          (target) =>
            typeof target === "string" &&
            (target.includes("packages/ui/") || target.startsWith("../")),
        );
      if (workspaceKeys.has(key) || targetsWorkspace) {
        delete tsconfig.compilerOptions.paths[key];
      }
    }

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
  for (const { fullPath, content } of readProjectFiles("**/*.css", {
    cwd: projectDir,
    ignore: LOCAL_PROJECT_ARTIFACT_GLOB_IGNORES,
  })) {
    try {
      const newContent = content.replace(
        /@source\s+["'][^"']*packages\/ui\/src[^"']*["'];\s*\n?/g,
        "",
      );

      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
      }
    } catch {
      continue;
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

const ASSISTANT_UI_OWNED_UI = new Set([
  "accordion",
  "badge",
  "diff-viewer",
  "direction",
  "dot-matrix",
  "number-roll",
  "select",
  "tabs",
]);

const BARE_ELEMENT_ITEMS = new Set([
  "file",
  "generative-ui",
  "heat-graph",
  "image",
  "logos",
  "markdown-text",
  "syntax-highlighter",
  "tooltip-icon-button",
]);

function toAssistantUIItem(specifier: string): string | null {
  let name = stripImportExtension(specifier);
  const inElements = name.startsWith("elements/");
  if (inElements) {
    name = name.slice("elements/".length);
  } else if (name.includes("/")) {
    return null;
  }
  if (name.endsWith(".aui")) {
    return name.slice(0, -".aui".length);
  }
  return inElements && !BARE_ELEMENT_ITEMS.has(name)
    ? `elements-${name}`
    : name;
}

/**
 * Example snapshots are downloaded at a release tag while the shadcn registry
 * is live, so a snapshot may import components at the legacy flat path
 * (`@/components/assistant-ui/<name>`) after the registry has moved the file
 * to `components/assistant-ui/elements/<name>.aui.tsx`. Resolve each legacy
 * specifier against the files the registry actually installed and rewrite it
 * only when the legacy path is absent and the elements layout has it.
 */
export async function reconcileAssistantUIImportLayout(
  projectDir: string,
): Promise<void> {
  const componentRoots = ["components", "src/components"]
    .map((dir) => path.join(projectDir, dir, "assistant-ui"))
    .filter((dir) => fs.existsSync(dir));
  if (componentRoots.length === 0) return;

  const resolvesAtLegacyPath = (name: string) =>
    componentRoots.some((root) =>
      [".tsx", ".ts", "/index.tsx", "/index.ts"].some((suffix) =>
        fs.existsSync(path.join(root, `${name}${suffix}`)),
      ),
    );

  // Index the installed tree by import name so the rewrite follows whatever
  // layout the registry delivered — some items install as
  // elements/<name>.aui.tsx, others as elements/<name>.tsx, and a future
  // layout move should not require new knowledge here.
  const installedByName = new Map<string, string>();
  for (const root of componentRoots) {
    for (const { file } of readProjectFiles("**/*.{ts,tsx}", { cwd: root })) {
      const normalized = file.split(path.sep).join("/");
      if (!normalized.includes("/")) continue;
      const specifier = normalized.replace(/\.[cm]?[tj]sx?$/, "");
      const name = path.posix.basename(specifier).replace(/\.aui$/, "");
      // A flat legacy import maps to the registry's `<name>` item, which is
      // the `.aui` file; a colliding bare file with the same basename belongs
      // to the distinct `elements-<name>` item, so the `.aui` variant wins.
      const existing = installedByName.get(name);
      if (
        existing === undefined ||
        (!existing.endsWith(".aui") && specifier.endsWith(".aui"))
      ) {
        installedByName.set(name, specifier);
      }
    }
  }
  if (installedByName.size === 0) return;

  const { default: jscodeshift } = await import("jscodeshift");
  const parsers = {
    ts: jscodeshift.withParser("ts"),
    tsx: jscodeshift.withParser("tsx"),
  };

  for (const { fullPath, content } of readProjectFiles("**/*.{ts,tsx}", {
    cwd: projectDir,
    ignore: LOCAL_PROJECT_ARTIFACT_GLOB_IGNORES,
  })) {
    if (!content.includes("@/components/assistant-ui/")) continue;

    const replacements: Array<{ start: number; end: number; value: string }> =
      [];
    const collectReplacement = (source: {
      value?: unknown;
      start?: number | null;
      end?: number | null;
    }) => {
      if (
        typeof source.value !== "string" ||
        source.start == null ||
        source.end == null
      ) {
        return;
      }

      const prefix = "@/components/assistant-ui/";
      if (!source.value.startsWith(prefix)) return;
      const specifier = source.value.slice(prefix.length);
      if (specifier.includes("/")) return;

      const name = stripImportExtension(specifier);
      const installed = installedByName.get(name);
      if (resolvesAtLegacyPath(name) || installed === undefined) return;

      const raw = content.slice(source.start, source.end);
      const quote = raw[0];
      if ((quote !== '"' && quote !== "'") || raw.at(-1) !== quote) return;
      replacements.push({
        start: source.start,
        end: source.end,
        value: `${quote}@/components/assistant-ui/${installed}${quote}`,
      });
    };

    const j = fullPath.endsWith(".tsx") ? parsers.tsx : parsers.ts;
    let root;
    try {
      root = j(content);
    } catch {
      continue;
    }
    root
      .find(j.ImportDeclaration)
      .forEach(({ node }) => collectReplacement(node.source));
    root
      .find(j.ExportNamedDeclaration)
      .forEach(({ node }) => node.source && collectReplacement(node.source));
    root
      .find(j.ExportAllDeclaration)
      .forEach(({ node }) => collectReplacement(node.source));

    let next = content;
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
      next =
        next.slice(0, replacement.start) +
        replacement.value +
        next.slice(replacement.end);
    }
    if (next !== content) fs.writeFileSync(fullPath, next);
  }
}

export function scanRequiredComponents(projectDir: string): RequiredComponents {
  const assistantUIComponents = new Set<string>();
  const shadcnUIComponents = new Set<string>();

  for (const { content } of readProjectFiles("**/*.{ts,tsx}", {
    cwd: projectDir,
    ignore: LOCAL_PROJECT_ARTIFACT_GLOB_IGNORES,
  })) {
    const assistantUIRegex =
      /from\s+["']@\/components\/assistant-ui\/([^"']+)["']/g;
    for (const match of content.matchAll(assistantUIRegex)) {
      const item = toAssistantUIItem(match[1]!);
      if (item) assistantUIComponents.add(item);
    }

    const uiRegex = /from\s+["']@\/components\/ui\/([^"']+)["']/g;
    for (const match of content.matchAll(uiRegex)) {
      const name = stripImportExtension(match[1]!);
      if (ASSISTANT_UI_OWNED_UI.has(name)) {
        assistantUIComponents.add(name);
      } else {
        shadcnUIComponents.add(name);
      }
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
    if (error instanceof SpawnSignalError) {
      throw error;
    }
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
): Promise<{ retryCommand: string } | undefined> {
  const [cmd, dlxArgs] = dlxCommand(pm);
  // For npm, dlxArgs may already include `--yes` for npx auto-install.
  // The trailing `--yes` is for shadcn's own confirmation prompt.
  const retryArgs = [...dlxArgs, "shadcn@latest", "add", ...components];
  const addArgs = [...retryArgs, "--yes"];

  try {
    await runSpawn(cmd, addArgs, projectDir);
    return undefined;
  } catch (error) {
    if (error instanceof SpawnSignalError) {
      throw error;
    }
    if (error instanceof SpawnExitError) {
      logger.warn(`shadcn exited with code ${error.code}.`);
      return { retryCommand: `${cmd} ${retryArgs.join(" ")}` };
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to install ${label}: ${message}`);
  }
}
