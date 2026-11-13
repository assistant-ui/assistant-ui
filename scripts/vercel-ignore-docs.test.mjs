import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  affectedFiles,
  decide,
  docsInputs,
  mdxImports,
} from "./vercel-ignore-docs.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const temporary = [];
after(() => {
  for (const dir of temporary) rmSync(dir, { recursive: true, force: true });
});

const write = (root, file, contents) => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(
    path.join(root, file),
    typeof contents === "string" ? contents : JSON.stringify(contents),
  );
};

const git = (root, ...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

const commit = (root, message) => {
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "--no-verify", "-m", message);
  return git(root, "rev-parse", "HEAD");
};

// Packages reach the docs four ways: a manifest dependency, a module specifier
// resolved through tsconfig paths, a path the build reads, and the manifest
// graph of any of those. A name in prose, a code sample, or a data file does
// not compile anything.
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "vercel-ignore-docs-"));
  temporary.push(root);
  for (const file of [
    "lib",
    "vercel-ignore-docs.mjs",
    "deploy-examples-changes.mjs",
  ]) {
    cpSync(
      path.join(repoRoot, "scripts", file),
      path.join(root, "scripts", file),
      {
        recursive: true,
      },
    );
  }
  write(root, "package.json", { name: "root", private: true });
  write(root, "apps/docs/package.json", {
    name: "docs",
    dependencies: { "@scope/declared": "workspace:*" },
  });
  write(
    root,
    "apps/docs/app/page.tsx",
    'import { Thing } from "@scope/imported/react";\n',
  );
  write(
    root,
    "apps/docs/scripts/paths.mts",
    'export const entry = path.join(ROOT, "packages/read-by-path/src/index.ts");\n',
  );
  write(
    root,
    "apps/docs/lib/downloads.ts",
    'export const names = ["@scope/listed"];\n',
  );
  write(
    root,
    "apps/docs/content/page.mdx",
    [
      'import { Demo } from "@scope/mdx-imported";',
      "",
      "Install `@scope/mentioned`:",
      "",
      "```tsx",
      'import { sample } from "@scope/sampled";',
      "```",
      "",
    ].join("\n"),
  );
  const packages = {
    declared: {},
    imported: { dependencies: { "@scope/transitive": "workspace:*" } },
    transitive: {},
    "read-by-path": {},
    "mdx-imported": {},
    listed: {},
    mentioned: {},
    sampled: {},
    ui: {},
    "x-buildutils": {},
  };
  for (const [dir, manifest] of Object.entries(packages)) {
    write(root, `packages/${dir}/package.json`, {
      name: `@scope/${dir}`,
      ...manifest,
    });
    write(root, `packages/${dir}/src/index.ts`, "export {};\n");
    write(root, `packages/${dir}/src/index.test.ts`, "test();\n");
  }
  git(root, "init", "--quiet", "--initial-branch=main");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "test");
  git(root, "config", "commit.gpgsign", "false");
  return root;
}

const docsFiles = (root) =>
  git(root, "ls-files", "--cached", "--others", "apps/docs")
    .split("\n")
    .filter(Boolean);

test("collects the packages the docs build compiles or reads", () => {
  const root = fixture();
  const packages = docsInputs(root, docsFiles(root)).filter((input) =>
    input.startsWith("packages/"),
  );
  assert.deepEqual(packages, [
    "packages/declared",
    "packages/imported",
    "packages/mdx-imported",
    "packages/read-by-path",
    "packages/transitive",
    "packages/x-buildutils",
  ]);
});

test("reads only MDX imports outside code fences", () => {
  assert.deepEqual(
    mdxImports(
      [
        'import { A } from "a";',
        "```ts",
        'import { B } from "b";',
        "```",
        "~~~",
        'import { C } from "c";',
        "~~~",
        'export { D } from "d";',
      ].join("\n"),
    ),
    ["a", "d"],
  );
});

test("separates docs inputs from the rest of the repository", () => {
  const root = fixture();
  const inputs = docsInputs(root, docsFiles(root));
  const reaches = (file) => affectedFiles([file], inputs).length > 0;
  for (const file of [
    "apps/docs/content/page.mdx",
    "apps/docs/app/page.test.tsx",
    "packages/imported/src/index.ts",
    "packages/transitive/README.md",
    "packages/listed/package.json",
    "pnpm-lock.yaml",
    "package.json",
    ".gitignore",
    "turbo.json",
    "scripts/lib/workspace.mjs",
    "scripts/vercel-ignore-docs.mjs",
  ]) {
    assert.equal(reaches(file), true, file);
  }
  for (const file of [
    "packages/imported/src/index.test.ts",
    "packages/listed/src/index.ts",
    "packages/sampled/src/index.ts",
    "examples/with-ai-sdk/app/page.tsx",
    "python/assistant-stream/src/stream.py",
    ".github/workflows/code-quality.yaml",
    ".changeset/tidy-donuts-render.md",
    "api-surface/assistant-ui__react.ts",
    "scripts/review-tier.mjs",
  ]) {
    assert.equal(reaches(file), false, file);
  }
});

test("keeps Tailwind-scanned package tests as inputs", () => {
  const root = fixture();
  write(
    root,
    "apps/docs/styles/globals.css",
    '@source "../../../packages/ui/src";\n',
  );
  const inputs = docsInputs(root, [
    ...docsFiles(root),
    "apps/docs/styles/globals.css",
  ]);
  assert.equal(
    affectedFiles(["packages/ui/src/index.test.ts"], inputs).length,
    1,
  );
});

test("skips only when every change since the last deployment is outside the docs", () => {
  const root = fixture();
  const deployed = commit(root, "deployed");
  write(root, "packages/listed/src/index.ts", "export const a = 1;\n");
  commit(root, "outside");
  assert.equal(
    decide(root, { VERCEL_GIT_PREVIOUS_SHA: deployed }).build,
    false,
  );

  write(root, "packages/transitive/src/index.ts", "export const b = 1;\n");
  commit(root, "inside");
  const result = decide(root, { VERCEL_GIT_PREVIOUS_SHA: deployed });
  assert.equal(result.build, true);
  assert.match(result.reason, /packages\/transitive\/src\/index\.ts/);
});

test("builds when the comparison cannot be made", () => {
  const root = fixture();
  commit(root, "only");
  assert.equal(decide(root, {}).build, true);
  const missing = decide(root, {
    VERCEL_GIT_PREVIOUS_SHA: "0".repeat(40),
  });
  assert.equal(missing.build, true);
  assert.match(missing.reason, /not fetchable/);
});

test("exits 0 to skip and 1 to build", () => {
  const root = fixture();
  const deployed = commit(root, "deployed");
  write(root, "packages/listed/src/index.ts", "export const a = 1;\n");
  commit(root, "outside");
  const run = (env) =>
    spawnSync(
      process.execPath,
      [path.join(root, "scripts/vercel-ignore-docs.mjs")],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, ...env },
      },
    );

  const skip = run({ VERCEL_GIT_PREVIOUS_SHA: deployed });
  assert.equal(skip.status, 0, skip.stderr);
  assert.match(skip.stdout, /^Skipping docs:/);

  const build = run({ VERCEL_GIT_PREVIOUS_SHA: "" });
  assert.equal(build.status, 1, build.stderr);
  assert.match(build.stdout, /^Building docs:/);
});

test("puts the packages the real docs import in the graph", () => {
  const files = execFileSync("git", ["ls-files", "apps/docs"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const inputs = docsInputs(repoRoot, files);
  for (const dir of [
    "packages/react",
    "packages/core",
    "packages/ui",
    "packages/eve",
    "packages/docs-theme",
  ]) {
    assert.ok(inputs.includes(dir), dir);
  }
});
