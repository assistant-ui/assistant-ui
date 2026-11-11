import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./lib/main.mjs";
import { isExcludedPackageTest } from "./lib/package-test-inputs.mjs";
import { readJson, readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const SHARED_BUILD_INPUTS = [
  ".github/workflows/code-quality.yaml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "scripts/app-build-inputs.mjs",
  "scripts/app-build-inputs.test.mjs",
  "turbo.json",
  "scripts/lib",
  "scripts/build-example-bundle.mjs",
  "scripts/package-example-bundles.mjs",
  "scripts/prepare-example-bundles.mjs",
  "scripts/run-example-bundles.mjs",
  "scripts/example-bundles.json",
  "scripts/example-bundles.test.mjs",
];

export const APP_BUILD_INPUTS = [
  ...SHARED_BUILD_INPUTS,
  "apps/docs/content",
  "examples",
  "templates",
];

const BUNDLE_INPUTS = [
  ...SHARED_BUILD_INPUTS,
  "apps/docs/content",
  "examples/bundle-shared",
  "packages/ui",
  "packages/x-buildutils",
];

const touches = (file, input) => file === input || file.startsWith(`${input}/`);

const touchesBuiltApp = (file) =>
  file.startsWith("apps/") && !file.startsWith("apps/docs/");

const defaultRepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const dependencyNames = (pkg) =>
  Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
    ...pkg.optionalDevDependencies,
  });

function workspaceInputs(workspaces, roots) {
  const queue = [...roots];
  const inputs = new Set();
  while (queue.length > 0) {
    const name = queue.shift();
    const entry = workspaces.get(name);
    if (!entry) throw new Error(`Missing workspace: ${name}`);
    const directory = path.posix.dirname(entry.manifest);
    if (inputs.has(directory)) continue;
    inputs.add(directory);
    queue.push(
      ...dependencyNames(entry.pkg).filter((dependency) =>
        workspaces.has(dependency),
      ),
    );
  }
  return [...inputs];
}

const readWorkspaces = (repoRoot) =>
  new Map(
    readWorkspaceManifestEntries(repoRoot).manifests.map((entry) => [
      entry.pkg.name,
      entry,
    ]),
  );

const isAppBuildRoot = (manifest) =>
  !/^(?:packages|examples)\/|^api-surface\/|^apps\/docs\//.test(manifest);

export function hasAppBuildInputs(changedFiles, repoRoot = defaultRepoRoot) {
  const files = changedFiles.filter((file) => !isExcludedPackageTest(file));
  if (
    files.some(
      (file) =>
        touchesBuiltApp(file) ||
        APP_BUILD_INPUTS.some((input) => touches(file, input)),
    )
  )
    return true;
  const packageFiles = files.filter((file) => file.startsWith("packages/"));
  if (packageFiles.length === 0) return false;

  // The roots are the workspaces the Build apps filters select, plus the root
  // package, which Turbo treats as a dependency of every workspace.
  const workspaces = readWorkspaces(repoRoot);
  const inputs = workspaceInputs(workspaces, [
    ...[...workspaces.values()]
      .filter(({ manifest }) => isAppBuildRoot(manifest))
      .map(({ pkg }) => pkg.name),
    ...dependencyNames(readJson(path.join(repoRoot, "package.json"))).filter(
      (dependency) => workspaces.has(dependency),
    ),
  ]);
  return packageFiles.some((file) =>
    inputs.some((input) => touches(file, input)),
  );
}

export function hasExampleBundleInputs(
  changedFiles,
  repoRoot = defaultRepoRoot,
) {
  if (changedFiles.length === 0) return false;
  if (
    changedFiles.some(
      (file) =>
        BUNDLE_INPUTS.some((input) => touches(file, input)) ||
        /^(?:packages|apps|examples|templates)\/[^/]+\/package\.json$/.test(
          file,
        ),
    )
  )
    return true;

  const bundles = readJson(path.join(repoRoot, "scripts/example-bundles.json"));
  const inputs = workspaceInputs(readWorkspaces(repoRoot), [
    ...bundles.map((bundle) => bundle.package),
    "bundle-shared",
    "@assistant-ui/ui",
    "@assistant-ui/x-buildutils",
  ]);
  return changedFiles.some(
    (file) =>
      !isExcludedPackageTest(file) &&
      inputs.some((input) => touches(file, input)),
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const changedFiles = readFileSync(0, "utf8")
    .split("\0")
    .filter((file) => file !== "");
  const detect = process.argv.includes("--bundles")
    ? hasExampleBundleInputs
    : hasAppBuildInputs;
  process.stdout.write(`${detect(changedFiles)}\n`);
}
