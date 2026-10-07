import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

const REACT_PATHS = new Set(["react", "react/*", "react-dom", "react-dom/*"]);

export function runTsc(project, cwd) {
  const result = spawnSync(
    "tsc",
    ["--noEmit", "--pretty", "false", "--project", project],
    { cwd, encoding: "utf8", shell: process.platform === "win32" },
  );
  if (result.error) throw result.error;
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

export function resolvedConfig(project, cwd) {
  const result = spawnSync("tsc", ["--showConfig", "--project", project], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `tsc --showConfig failed:\n${result.stdout}${result.stderr}`,
    );
  }
  return JSON.parse(result.stdout);
}

// tsc merges an `extends` array option by option, so a tsconfig listed after the React 18 preset, or an override in the project itself, silently restores React 19's types or skipLibCheck.
const REACT_18_TYPES = {
  react: "@types/react-v18",
  "react/*": "@types/react-v18",
  "react-dom": "@types/react-dom-v18",
  "react-dom/*": "@types/react-dom-v18",
};

export function configProblems(config) {
  const problems = [];
  const paths = config.compilerOptions?.paths ?? {};
  const unmapped = Object.entries(REACT_18_TYPES)
    .filter(
      ([key, target]) =>
        !(paths[key] ?? []).some((path) => path.includes(target)),
    )
    .map(([key]) => `\`${key}\``);
  if (unmapped.length > 0) {
    problems.push(`it doesn't map ${unmapped.join(", ")} to React 18's types`);
  }
  if (config.compilerOptions?.skipLibCheck !== false) {
    problems.push("it has skipLibCheck on, so declaration files go unchecked");
  }
  return problems;
}

// The resolved project with the React 18 path mappings removed, so the same files type-check against the workspace's React 19.
export function react19Baseline(config) {
  const baseline = structuredClone(config);
  const paths = Object.fromEntries(
    Object.entries(baseline.compilerOptions?.paths ?? {}).filter(
      ([key]) => !REACT_PATHS.has(key),
    ),
  );
  if (Object.keys(paths).length > 0) baseline.compilerOptions.paths = paths;
  else delete baseline.compilerOptions?.paths;
  return baseline;
}

function mtimes(dir, keep) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && keep(entry.name))
    .map((entry) => statSync(join(entry.parentPath, entry.name)).mtimeMs);
}

// Whether the resolved project reads dist, through an include pattern rooted inside it or a file it resolved there.
export function readsDist(config, projectDir, cwd) {
  const dist = join(cwd, "dist");
  const insideDist = (path) => {
    const fromDist = relative(dist, resolve(projectDir, path));
    return !fromDist.startsWith("..") && !isAbsolute(fromDist);
  };
  const includeRoots = (config.include ?? []).map((pattern) => {
    const segments = pattern.split("/");
    const glob = segments.findIndex((segment) => /[*?[{]/.test(segment));
    return (glob === -1 ? segments : segments.slice(0, glob)).join("/") || ".";
  });
  return [...includeRoots, ...(config.files ?? [])].some(insideDist);
}

// "missing" when dist has no declarations, "stale" when any src file is newer than the oldest one.
export function declarationState(cwd) {
  const declarations = mtimes(join(cwd, "dist"), (name) =>
    /\.d\.[cm]?ts$/.test(name),
  );
  if (declarations.length === 0) return "missing";
  const sources = mtimes(join(cwd, "src"), () => true);
  return sources.length > 0 && Math.max(...sources) > Math.min(...declarations)
    ? "stale"
    : "fresh";
}
