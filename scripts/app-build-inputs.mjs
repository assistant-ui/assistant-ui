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
  "packages",
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

export function hasAppBuildInputs(changedFiles) {
  return changedFiles.some(
    (file) =>
      !isExcludedPackageTest(file) &&
      (touchesBuiltApp(file) ||
        APP_BUILD_INPUTS.some((input) => touches(file, input))),
  );
}

export function hasExampleBundleInputs(
  changedFiles,
  repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
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

  const { manifests } = readWorkspaceManifestEntries(repoRoot);
  const workspaces = new Map(manifests.map((entry) => [entry.pkg.name, entry]));
  const bundles = readJson(path.join(repoRoot, "scripts/example-bundles.json"));
  const queue = [
    ...bundles.map((bundle) => bundle.package),
    "bundle-shared",
    "@assistant-ui/ui",
    "@assistant-ui/x-buildutils",
  ];
  const inputs = new Set();
  while (queue.length > 0) {
    const name = queue.shift();
    const entry = workspaces.get(name);
    if (!entry) throw new Error(`Missing bundle workspace: ${name}`);
    const directory = path.posix.dirname(entry.manifest);
    if (inputs.has(directory)) continue;
    inputs.add(directory);
    const { pkg } = entry;
    queue.push(
      ...Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
        ...pkg.optionalDependencies,
        ...pkg.optionalDevDependencies,
      }).filter((dependency) => workspaces.has(dependency)),
    );
  }
  return changedFiles.some(
    (file) =>
      !isExcludedPackageTest(file) &&
      [...inputs].some((input) => touches(file, input)),
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
