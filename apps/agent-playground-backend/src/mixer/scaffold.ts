import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { getRecipe } from "./catalog/index.js";
import type { Recipe, EnvVar } from "./catalog/types.js";
import {
  getWorkspaceVersionMap,
  type UnknownWorkspaceDependencyPolicy,
} from "./version-maps/index.js";

export interface ScaffoldOptions {
  recipeId: string;
  outputDir: string;
  refOverride?: string;
  dryRun?: boolean;
  unknownWorkspaceDependencyPolicy?: UnknownWorkspaceDependencyPolicy;
}

export interface ScaffoldResult {
  recipe: Recipe;
  outputDir: string;
  filesCopied: number;
  depVersionsRewritten: number;
  packagesRemoved: string[];
  unknownWorkspaceDeps: string[];
  envVarsWritten: string[];
  warnings: string[];
  nextSteps: string[];
  dryRun: boolean;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  ".git",
  "out",
]);

function resolveSourceBase(refOverride?: string): string {
  if (refOverride) return refOverride;
  if (process.env.ASSISTANT_UI_REFERENCE_PATH)
    return process.env.ASSISTANT_UI_REFERENCE_PATH;
  const thisDir = dirname(fileURLToPath(import.meta.url));
  return join(thisDir, "assets", "recipes", "assistant-ui");
}

function copySource(sourceDir: string, outputDir: string): number {
  let count = 0;
  cpSync(sourceDir, outputDir, {
    recursive: true,
    filter(src) {
      const base = basename(src);
      if (SKIP_DIRS.has(base)) return false;
      count++;
      return true;
    },
  });
  return count;
}

function countCopyableFiles(sourceDir: string): number {
  let count = 0;
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      count++;
      if (entry.isDirectory()) {
        walk(join(dir, entry.name));
      }
    }
  }
  walk(sourceDir);
  return count;
}

type DepField =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";
const DEP_FIELDS: DepField[] = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

function isWorkspaceVersion(v: unknown): boolean {
  return typeof v === "string" && (v === "workspace:*" || v === "workspace:^");
}

interface RewriteResult {
  rewritten: number;
  removed: number;
  removedNames: string[];
  unknown: string[];
}

function rewritePackageJson(
  pkgPath: string,
  policy: UnknownWorkspaceDependencyPolicy,
  write: boolean,
): RewriteResult {
  const { versions, removePackages } = getWorkspaceVersionMap();
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  let rewritten = 0;
  let removed = 0;
  const removedNames: string[] = [];
  const unknown: string[] = [];

  for (const field of DEP_FIELDS) {
    const deps = pkg[field] as Record<string, string> | undefined;
    if (!deps) continue;

    for (const [name, version] of Object.entries(deps)) {
      if (!isWorkspaceVersion(version)) continue;

      if (removePackages.includes(name)) {
        delete deps[name];
        removed++;
        removedNames.push(name);
        continue;
      }

      if (versions[name]) {
        deps[name] = versions[name];
        rewritten++;
        continue;
      }

      unknown.push(`${field}.${name}`);
      if (policy === "fail") {
        throw new Error(
          `Unknown workspace:* package "${name}" in ${field}. Add to version-map or REMOVE_PACKAGES.`,
        );
      } else {
        deps[name] = "*";
        rewritten++;
      }
    }
  }

  if (write) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  }

  return { rewritten, removed, removedNames, unknown };
}

function generateEnvExample(
  outputDir: string,
  envVars: EnvVar[],
  write: boolean,
): string[] {
  const envPath = join(outputDir, ".env.example");
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const written: string[] = [];

  let additions = "";
  for (const v of envVars) {
    if (existing.includes(v.name)) continue;
    const comment = v.required
      ? `# Required — ${v.description}`
      : `# Optional — ${v.description}`;
    additions += `\n${comment}\n${v.name}=\n`;
    written.push(v.name);
  }

  if (write) {
    if (additions) {
      writeFileSync(envPath, `${existing.trimEnd()}\n${additions}`, "utf8");
    } else if (!existsSync(envPath) && envVars.length > 0) {
      let content = "";
      for (const v of envVars) {
        content += `# ${v.required ? "Required" : "Optional"} — ${v.description}\n${v.name}=\n\n`;
        written.push(v.name);
      }
      writeFileSync(envPath, content, "utf8");
    }
  } else {
    for (const v of envVars) {
      if (!existing.includes(v.name)) {
        written.push(v.name);
      }
    }
  }

  return written;
}

export async function scaffold(
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  const {
    recipeId,
    outputDir,
    refOverride,
    dryRun = false,
    unknownWorkspaceDependencyPolicy: policy = "warn",
  } = options;

  const recipe = getRecipe(recipeId);
  const sourceBase = resolveSourceBase(refOverride);
  const sourceDir = join(sourceBase, recipe.sourcePath);

  if (!existsSync(sourceDir)) {
    throw new Error(
      `Source directory not found: ${sourceDir}. ` +
        (refOverride || process.env.ASSISTANT_UI_REFERENCE_PATH
          ? "Check your --ref path or ASSISTANT_UI_REFERENCE_PATH env var."
          : 'Bundled assets may be missing — run "npm run prebuild" first.'),
    );
  }

  if (existsSync(outputDir)) {
    const contents = readdirSync(outputDir);
    if (contents.length > 0) {
      throw new Error(
        `Output directory is not empty: ${outputDir}. ` +
          "Scaffold requires an empty or non-existent output directory.",
      );
    }
  }

  if (dryRun) {
    const filesCopied = countCopyableFiles(sourceDir);
    const pkgPath = join(sourceDir, "package.json");
    const rewriteInfo = existsSync(pkgPath)
      ? rewritePackageJson(pkgPath, policy, false)
      : {
          rewritten: 0,
          removed: 0,
          removedNames: [] as string[],
          unknown: [] as string[],
        };
    const envVarsWritten = generateEnvExample(sourceDir, recipe.env, false);

    return {
      recipe,
      outputDir,
      filesCopied,
      depVersionsRewritten: rewriteInfo.rewritten,
      packagesRemoved: rewriteInfo.removedNames,
      unknownWorkspaceDeps: rewriteInfo.unknown,
      envVarsWritten,
      warnings: rewriteInfo.unknown.map(
        (u) => `Unknown workspace:* dependency: ${u} — replaced with "*"`,
      ),
      nextSteps: [
        `cd ${outputDir}`,
        "cp .env.example .env && fill in values",
        "npm install",
        "npm run dev",
      ],
      dryRun: true,
    };
  }

  mkdirSync(outputDir, { recursive: true });
  const filesCopied = copySource(sourceDir, outputDir);

  const pkgPath = join(outputDir, "package.json");
  let rewriteInfo: RewriteResult = {
    rewritten: 0,
    removed: 0,
    removedNames: [],
    unknown: [],
  };
  if (existsSync(pkgPath)) {
    rewriteInfo = rewritePackageJson(pkgPath, policy, true);
  }

  const envVarsWritten = generateEnvExample(outputDir, recipe.env, true);

  const warnings: string[] = [];
  for (const u of rewriteInfo.unknown) {
    warnings.push(`Unknown workspace:* dependency: ${u} — replaced with "*"`);
  }

  return {
    recipe,
    outputDir,
    filesCopied,
    depVersionsRewritten: rewriteInfo.rewritten,
    packagesRemoved: rewriteInfo.removedNames,
    unknownWorkspaceDeps: rewriteInfo.unknown,
    envVarsWritten,
    warnings,
    nextSteps: [
      `cd ${outputDir}`,
      "cp .env.example .env && fill in values",
      "npm install",
      "npm run dev",
    ],
    dryRun: false,
  };
}
