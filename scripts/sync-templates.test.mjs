import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
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

test("cloud harness kit follows canonical sources and minimal overrides while keeping its app routes", (t) => {
  const fixture = mkdtempSync(path.join(tmpdir(), "aui-template-sync-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const write = (relative, value) => {
    const file = path.join(fixture, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, value);
  };
  mkdirSync(path.join(fixture, "scripts"));
  cpSync(path.join(repoRoot, scriptFile), path.join(fixture, scriptFile));
  const canonical = "export const ToolFallback = () => 2;\n";
  const previous = "export const ToolFallback = () => 1;\n";
  const override = "export const Thread = () => 'minimal';\n";
  write(
    `${sourceRoot}/components/react/assistant-ui/elements/tool-fallback.aui.tsx`,
    canonical,
  );
  write(
    `${sourceRoot}/components/react/assistant-ui/elements/thread.aui.tsx`,
    "export const Thread = () => 'full';\n",
  );
  write(
    "templates/minimal/components/assistant-ui/elements/tool-fallback.aui.tsx",
    previous,
  );
  write(
    "templates/minimal/components/assistant-ui/elements/thread.aui.tsx",
    override,
  );
  write(
    "templates/cloud-harness/components/assistant-ui/elements/tool-fallback.aui.tsx",
    previous,
  );
  write(
    "templates/cloud-harness/components/assistant-ui/elements/thread.aui.tsx",
    "export const Thread = () => 'stale';\n",
  );
  write(
    "templates/cloud-harness/app/assistant.tsx",
    "export const Assistant = () => 'shared';\n",
  );
  write(
    "templates/cloud-harness/hooks/removed.ts",
    "export const removed = true;\n",
  );
  write(
    "templates/cloud-harness/app/api/chat/route.ts",
    "export const POST = () => 'harness';\n",
  );
  for (const [source, target] of [
    [
      "apps/registry/app/api/chat/route.ts",
      "templates/minimal/app/api/chat/route.ts",
    ],
    [
      "apps/registry/app/ai-sdk/assistant.tsx",
      "templates/minimal/app/assistant.tsx",
    ],
  ]) {
    write(source, "export const fixture = 1;\n");
    write(target, "export const fixture = 1;\n");
  }
  write("bin/pnpm", "#!/bin/sh\nexit 0\n");
  execFileSync("chmod", ["+x", path.join(fixture, "bin/pnpm")]);
  execFileSync("git", ["init", "--quiet"], { cwd: fixture });
  const check = spawnSync("bash", [scriptFile], {
    cwd: fixture,
    encoding: "utf8",
  });
  assert.equal(check.status, 1);
  assert.match(check.stdout, /stale mirrored cloud-harness/);
  assert.match(check.stdout, /cloud-harness kit file/);
  execFileSync("bash", [scriptFile, "--write"], {
    cwd: fixture,
    env: { ...process.env, PATH: `${fixture}/bin:${process.env.PATH}` },
  });
  assert.equal(
    existsSync(path.join(fixture, "templates/cloud-harness/hooks/removed.ts")),
    false,
  );
  assert.equal(
    readFileSync(
      path.join(
        fixture,
        "templates/cloud-harness/components/assistant-ui/elements/tool-fallback.aui.tsx",
      ),
      "utf8",
    ),
    canonical,
  );
  assert.equal(
    readFileSync(
      path.join(
        fixture,
        "templates/cloud-harness/components/assistant-ui/elements/thread.aui.tsx",
      ),
      "utf8",
    ),
    override,
  );
  assert.equal(
    readFileSync(
      path.join(fixture, "templates/cloud-harness/app/assistant.tsx"),
      "utf8",
    ),
    "export const Assistant = () => 'shared';\n",
  );
  assert.equal(
    readFileSync(
      path.join(fixture, "templates/cloud-harness/app/api/chat/route.ts"),
      "utf8",
    ),
    "export const POST = () => 'harness';\n",
  );
  execFileSync("bash", [scriptFile], { cwd: fixture });
});

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

const parseWorkflowPathBlocks = (source) => {
  const lines = source.split(/\r?\n/);
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const pathsMatch = lines[index].match(/^([ \t]*)paths:[ \t]*$/);
    if (!pathsMatch) continue;

    const pathsIndent = pathsMatch[1].length;
    const paths = [];
    for (index += 1; index < lines.length; index += 1) {
      const itemMatch = lines[index].match(/^([ \t]*)-[ \t]+(.+?)[ \t]*$/);
      if (!itemMatch || itemMatch[1].length <= pathsIndent) break;

      const scalar = itemMatch[2];
      const quote = scalar[0];
      if ((quote === '"' || quote === "'") && scalar.at(-1) === quote) {
        paths.push(
          quote === '"'
            ? JSON.parse(scalar)
            : scalar.slice(1, -1).replaceAll("''", "'"),
        );
      } else {
        paths.push(scalar);
      }
    }
    blocks.push(paths.sort());
  }

  return blocks;
};

const workflowPathBlocks = parseWorkflowPathBlocks(workflow);

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

test("workflow path parsing ignores indentation and quote style", () => {
  assert.deepEqual(
    parseWorkflowPathBlocks(
      `on:\n  pull_request:\n    paths:\n        - unquoted\n        - 'single-quoted'\n        - "double-quoted"\n`,
    ),
    [["double-quoted", "single-quoted", "unquoted"]],
  );
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
