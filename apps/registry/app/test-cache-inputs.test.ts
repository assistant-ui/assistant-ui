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
const registry = "@assistant-ui/shadcn-registry";
const externalSources = [
  "apps/docs/components/pages/docs/fumadocs/install/packaged-file-url.ts",
  "templates/default/app/api/chat/route.ts",
  "templates/mcp/app/api/mcp-apps/route.ts",
  "templates/mcp/app/api/request-context.ts",
  "templates/vscode/src/openai.ts",
  "examples/with-expo/app/showcase/thread.tsx",
];

type PlannedTask = { taskId: string; hash: string };

it("invalidates registry test caches when their external contract sources change", ({
  onTestFinished,
}) => {
  const root = mkdtempSync(join(tmpdir(), "aui-registry-test-inputs-"));
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
        ["run", "test", "test:coverage", `--filter=${registry}`, "--dry=json"],
        {
          cwd: root,
          encoding: "utf8",
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
  const testTasks = ["test", "test:coverage"].map(
    (task) => `${registry}#${task}`,
  );
  for (const task of [...testTasks, `${registry}#build`]) {
    expect(before[task]).toBeTypeOf("string");
  }
  for (const file of externalSources) {
    write(file, "export const value = 2;\n");
    const after = plan();
    for (const task of testTasks)
      expect(after[task], file).not.toBe(before[task]);
    expect(after[`${registry}#build`], file).toBe(before[`${registry}#build`]);
    write(file, "export const value = 1;\n");
  }

  const added = "examples/with-expo/components/new-component.tsx";
  write(added, "export const component = true;\n");
  git("add", added);
  for (const task of testTasks) expect(plan()[task]).not.toBe(before[task]);
  git("rm", "--quiet", "--force", added);
  git("rm", "--quiet", externalSources[5]!);
  for (const task of testTasks) expect(plan()[task]).not.toBe(before[task]);
  git(
    "restore",
    "--source=HEAD",
    "--staged",
    "--worktree",
    externalSources[5]!,
  );

  for (const directory of ["node_modules", ".next", "dist", "build"]) {
    write(`examples/with-expo/${directory}/generated.ts`, "ignored artifact");
  }
  write("apps/docs/components/unrelated.tsx", "unrelated docs edit");
  expect(plan()).toEqual(before);
}, 30_000);
