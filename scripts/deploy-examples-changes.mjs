import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WORKFLOW_FILE = ".github/workflows/deploy-examples.yaml";

export const EXAMPLES = {
  "with-expo": {
    matrix: {
      example: "with-expo",
      "chat-endpoint-url": "https://www.assistant-ui.com/api/chat",
    },
    // The kit is consumed through tsconfig paths, not a package dependency.
    extraInputs: ["packages/ui"],
  },
  "with-react-ink-web": {
    matrix: { example: "with-react-ink-web" },
    extraInputs: [],
  },
};

// The root install and build configuration and aui-build shape every dist, and
// this planner shapes the matrix.
const SHARED_INPUTS = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "scripts/vercel-ignore-changeset-release.sh",
  "scripts/deploy-examples-changes.mjs",
  "packages/x-buildutils",
  WORKFLOW_FILE,
];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// aui-build inlines workspace devDependencies into a CommonJS dist, so for a
// package whose exports target .cjs they are inputs like its runtime ones.
const bundlesDevDependencies = (pkg) =>
  JSON.stringify(pkg.exports ?? {}).includes(".cjs");

const linkedDependencies = (pkg, { withDev }) =>
  Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
    ...(withDev ? pkg.devDependencies : {}),
  });

export function workspacePackages(repoRoot) {
  const packages = new Map();
  for (const entry of readdirSync(path.join(repoRoot, "packages"), {
    withFileTypes: true,
  })) {
    const packageJson = path.join(
      repoRoot,
      "packages",
      entry.name,
      "package.json",
    );
    if (entry.isDirectory() && existsSync(packageJson)) {
      packages.set(readJson(packageJson).name, `packages/${entry.name}`);
    }
  }
  return packages;
}

export function exampleInputs(repoRoot, example) {
  const packages = workspacePackages(repoRoot);
  const pkg = readJson(
    path.join(repoRoot, "examples", example, "package.json"),
  );
  const inputs = new Set([
    `examples/${example}`,
    ...EXAMPLES[example].extraInputs,
    ...SHARED_INPUTS,
  ]);
  const queue = linkedDependencies(pkg, { withDev: true });
  while (queue.length > 0) {
    const dir = packages.get(queue.shift());
    if (dir === undefined || inputs.has(dir)) continue;
    inputs.add(dir);
    const dependency = readJson(path.join(repoRoot, dir, "package.json"));
    queue.push(
      ...linkedDependencies(dependency, {
        withDev: bundlesDevDependencies(dependency),
      }),
    );
  }
  return [...inputs].sort();
}

export function allInputs(repoRoot) {
  return [
    ...new Set(
      Object.keys(EXAMPLES).flatMap((example) =>
        exampleInputs(repoRoot, example),
      ),
    ),
  ].sort();
}

const touches = (file, input) => file === input || file.startsWith(`${input}/`);

export function planDeploys(repoRoot, changedFiles) {
  const include = Object.keys(EXAMPLES)
    .filter(
      (example) =>
        changedFiles === null ||
        exampleInputs(repoRoot, example).some((input) =>
          changedFiles.some((file) => touches(file, input)),
        ),
    )
    .map((example) => EXAMPLES[example].matrix);
  return { matrix: { include }, any: include.length > 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const changedFiles = process.argv.includes("--all")
    ? null
    : readFileSync(0, "utf8")
        .split("\0")
        .filter((file) => file !== "");
  process.stdout.write(
    `${JSON.stringify(planDeploys(repoRoot, changedFiles))}\n`,
  );
}
