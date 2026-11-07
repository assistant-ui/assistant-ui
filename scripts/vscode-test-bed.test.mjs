import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const root = path.resolve(import.meta.dirname, "..");
const workflow = readFileSync(
  path.join(root, ".github/workflows/vscode-test-bed.yaml"),
  "utf8",
);

function pathsFor(event) {
  const block = workflow.match(
    new RegExp(`^  ${event}:\\n[\\s\\S]*?(?=^  \\w+:|^\\S)`, "m"),
  );
  assert.ok(block, event);
  return [...block[0].matchAll(/^      - (.+)$/gm)].map((match) =>
    match[1].replace(/^["']|["']$/g, ""),
  );
}

for (const event of ["pull_request", "push"]) {
  const paths = pathsFor(event);
  const runsFor = (file) =>
    paths.some((pattern) => path.posix.matchesGlob(file, pattern));

  test(`${event}: VS Code probes cover the extension and template`, () => {
    for (const file of [
      "examples/with-vscode/webview/probes.ts",
      "templates/vscode/src/extension.ts",
      "packages/vscode/src/host/router.ts",
    ]) {
      assert.equal(runsFor(file), true, file);
    }
  });

  test(`${event}: VS Code probes cover installed workspace dependencies`, () => {
    const { manifests } = readWorkspaceManifestEntries(root);
    const entries = new Map(manifests.map((entry) => [entry.pkg.name, entry]));
    const rootPackage = JSON.parse(
      readFileSync(path.join(root, "package.json")),
    );
    const queue = [
      "with-vscode",
      "@assistant-ui/react-devtools",
      ...Object.keys(rootPackage.devDependencies).filter((name) =>
        entries.has(name),
      ),
    ];
    const visited = new Set();
    const missing = [];
    while (queue.length) {
      const name = queue.shift();
      if (visited.has(name)) continue;
      visited.add(name);
      const entry = entries.get(name);
      assert.ok(entry, name);
      const directory = path.posix.dirname(entry.manifest);
      if (!runsFor(`${directory}/src/index.ts`)) missing.push(directory);
      queue.push(
        ...Object.keys({
          ...entry.pkg.dependencies,
          ...entry.pkg.devDependencies,
          ...entry.pkg.peerDependencies,
          ...entry.pkg.optionalDependencies,
          ...entry.pkg.optionalDevDependencies,
        }).filter((dependency) => entries.has(dependency)),
      );
    }
    assert.deepEqual(missing.sort(), []);
  });

  test(`${event}: VS Code probes cover shared build and workflow inputs`, () => {
    for (const file of [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "turbo.json",
      ".github/workflows/vscode-test-bed.yaml",
    ]) {
      assert.equal(runsFor(file), true, file);
    }
  });

  test(`${event}: unrelated docs, examples, and packages stay filtered out`, () => {
    for (const file of [
      "README.md",
      "scripts/lib/review-policy.mjs",
      "apps/docs/content/docs/index.mdx",
      "examples/with-ai-sdk/app/page.tsx",
      "packages/react-google-adk/src/index.ts",
    ]) {
      assert.equal(runsFor(file), false, file);
    }
  });
}
