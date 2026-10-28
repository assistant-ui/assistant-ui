import { execFileSync } from "node:child_process";
import {
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../..");
const docs = "@assistant-ui/docs-site";
const expoSource = "examples/with-expo/app/showcase/thread.tsx";
const externalSources = [
  "examples/with-langgraph/app/api/[..._path]/route.ts",
  "examples/with-nuxt/server/api/chat.post.ts",
  "templates/nuxt/server/api/chat.post.ts",
  expoSource,
  "examples/with-react-ink/src/app.tsx",
  "README.md",
];

type PlannedTask = { taskId: string; hash: string };

it("invalidates docs test caches for external contract sources without building the docs", ({
  onTestFinished,
}) => {
  const root = mkdtempSync(join(tmpdir(), "aui-docs-test-inputs-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  const write = (file: string, content: string | Uint8Array) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  for (const file of [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    ".gitignore",
    "api-surface/package.json",
    ...globSync("{apps,examples,packages,templates}/*/{package,turbo}.json", {
      cwd: repo,
    }),
  ]) {
    write(file, readFileSync(join(repo, file)));
  }
  for (const file of externalSources) write(file, "export const value = 1;\n");
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init", "--quiet");
  git("add", ".");
  git(
    "-c",
    "user.name=Cache contract",
    "-c",
    "user.email=cache@example.invalid",
    "commit",
    "-qm",
    "test inputs",
  );
  const plan = () => {
    const result = JSON.parse(
      execFileSync(
        join(repo, "node_modules/.bin/turbo"),
        ["run", "test", "test:coverage", `--filter=${docs}`, "--dry=json"],
        {
          cwd: root,
          encoding: "utf8",
          stdio: "pipe",
          maxBuffer: 32 * 1024 * 1024,
          timeout: 30_000,
        },
      ),
    ) as { tasks: PlannedTask[] };
    return Object.fromEntries(
      result.tasks.map((task) => [task.taskId, task.hash]),
    );
  };
  const before = plan();
  const testTasks = ["test", "test:coverage"].map((task) => `${docs}#${task}`);
  const coreBuild = "@assistant-ui/core#build";
  for (const task of [...testTasks, coreBuild]) {
    expect(before[task]).toBeTypeOf("string");
  }
  expect(before[`${docs}#build`]).toBeUndefined();
  const expectInvalidated = (file: string) => {
    const after = plan();
    for (const task of testTasks)
      expect(after[task], file).not.toBe(before[task]);
    expect(after[coreBuild], file).toBe(before[coreBuild]);
  };
  for (const file of externalSources) {
    write(file, "export const value = 2;\n");
    expectInvalidated(file);
    write(file, "export const value = 1;\n");
  }

  const manifest = "packages/react-ink/package.json";
  const original = readFileSync(join(root, manifest), "utf8");
  const pkg = JSON.parse(original);
  write(manifest, JSON.stringify({ ...pkg, private: !pkg.private }));
  expectInvalidated(manifest);
  write(manifest, original);

  const added = "examples/with-expo/app/showcase/new-component.tsx";
  write(added, "export const component = true;\n");
  git("add", added);
  expectInvalidated(added);
  git("rm", "--quiet", "--force", added);
  git("rm", "--quiet", expoSource);
  expectInvalidated(expoSource);
  git("restore", "--source=HEAD", "--staged", "--worktree", expoSource);

  for (const file of [
    "examples/with-langgraph/.next/server/output.js",
    "examples/with-nuxt/.output/server/index.mjs",
    "examples/with-expo/node_modules/dependency/index.ts",
    "examples/with-langgraph/app/page.tsx",
    "apps/docs/generated/.repo-source/output.ts",
  ]) {
    write(file, "unrelated source or generated output");
  }
  expect(plan()).toEqual(before);
}, 30_000);
