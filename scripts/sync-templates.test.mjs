import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const scriptFile = "scripts/sync-templates.sh";
const testFile = "scripts/sync-templates.test.mjs";
const workflowFile = ".github/workflows/template-sync.yaml";
const script = readFileSync(path.join(repoRoot, scriptFile), "utf8");
const workflow = readFileSync(path.join(repoRoot, workflowFile), "utf8");

const requiredMatch = (source, pattern, label) => {
  const match = source.match(pattern);
  assert.ok(match, label);
  return match;
};

const sourceRoot = requiredMatch(
  script,
  /^UI_SRC_REL="([^"]+)"$/m,
  "tracked packages/ui source root",
)[1];
const trackedRoots = requiredMatch(
  script,
  /^done < <\(git -C "\$ROOT_DIR" ls-files -- ([^)]+)\)$/m,
  "tracked project roots",
)[1]
  .trim()
  .split(/\s+/);
const extensions = [
  ...requiredMatch(
    script,
    /case "\$rel" in\s*\n\s*([^)]*)\)/,
    "tracked source extensions",
  )[1].matchAll(/\*\.([a-z0-9]+)/g),
].map((match) => match[1]);
const readsProjectTsconfig =
  /\$ROOT_DIR\/\$\{rel%%\/\*\}\/\$name\/tsconfig\.json/.test(script);
const expectedPaths = [
  scriptFile,
  testFile,
  ...[sourceRoot, ...trackedRoots].flatMap((root) =>
    extensions.map((extension) => `${root}/**/*.${extension}`),
  ),
  ...(readsProjectTsconfig
    ? trackedRoots.map((root) => `${root}/*/tsconfig.json`)
    : []),
  workflowFile,
].sort();

const workflowPathBlocks = [
  ...workflow.matchAll(/^    paths:\n((?:      - .*\n)+)/gm),
].map((match) =>
  match[1]
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line.replace(/^\s*- /, "")))
    .sort(),
);

const globToRegExp = (glob) => {
  let source = "^";
  for (let index = 0; index < glob.length;) {
    if (glob.startsWith("**/", index)) {
      source += "(?:.*/)?";
      index += 3;
    } else if (glob.startsWith("**", index)) {
      source += ".*";
      index += 2;
    } else if (glob[index] === "*") {
      source += "[^/]*";
      index += 1;
    } else {
      source += glob[index].replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
      index += 1;
    }
  }
  return new RegExp(`${source}$`);
};

const isCovered = (file) =>
  expectedPaths.some((input) => globToRegExp(input).test(file));

test("push and pull request paths match every tracked script input", () => {
  assert.equal(workflowPathBlocks.length, 2);
  assert.deepEqual(workflowPathBlocks[0], expectedPaths);
  assert.deepEqual(workflowPathBlocks[1], expectedPaths);
});

test("tracked directories and mirrors are covered by the workflow", () => {
  const sourceDirectories = [
    ...script.matchAll(/^[A-Z][A-Z_]*_DIR="\$ROOT_DIR\/([^"]+)"$/gm),
  ].map((match) => match[1]);
  for (const directory of sourceDirectories) {
    assert.ok(
      extensions.some((extension) =>
        isCovered(`${directory}/input.${extension}`),
      ),
      `${directory} is not covered`,
    );
  }

  const mirrors = requiredMatch(
    script,
    /^REGISTRY_MIRRORS=\(\n([\s\S]*?)^\)$/m,
    "registry mirrors",
  )[1];
  for (const match of mirrors.matchAll(/^\s*"([^"]+):([^"]+)"$/gm)) {
    assert.ok(isCovered(match[1]), `${match[1]} is not covered`);
    assert.ok(isCovered(match[2]), `${match[2]} is not covered`);
  }

  if (readsProjectTsconfig) {
    for (const root of trackedRoots) {
      assert.ok(
        isCovered(`${root}/project/tsconfig.json`),
        `${root} project tsconfig.json is not covered`,
      );
    }
  }
});
