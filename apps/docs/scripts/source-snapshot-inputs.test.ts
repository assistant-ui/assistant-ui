import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

const repo = path.resolve(import.meta.dirname, "../../..");
const turbo = path.join(repo, "node_modules/.bin/turbo");
const docsTask = "@assistant-ui/docs-site#build";
const coreTask = "@assistant-ui/core#build";

type PlannedTask = { taskId: string; hash: string };

it("invalidates the docs snapshot for tracked sources outside the docs dependency graph", ({
  onTestFinished,
}) => {
  const root = mkdtempSync(path.join(tmpdir(), "aui-snapshot-inputs-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  const write = (file: string, text: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  const files = [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    ".gitignore",
    "api-surface/package.json",
    ...globSync("{apps,examples,packages,templates}/*/{package,turbo}.json", {
      cwd: repo,
    }),
    "apps/docs/scripts/generate-source-snapshot.mts",
    "apps/docs/scripts/source-snapshot-budget.mts",
    "examples/with-react-ink/src/app.tsx",
    "README.md",
  ];
  for (const file of files) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    copyFileSync(path.join(repo, file), path.join(root, file));
  }
  write(
    "packages/core/src/input-contract.test.ts",
    "export const value = 1;\n",
  );
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init", "--quiet");
  git("add", ".");
  git(
    "-c",
    "user.name=Snapshot fixture",
    "-c",
    "user.email=snapshot@example.invalid",
    "commit",
    "-qm",
    "source snapshot inputs",
  );
  const plan = () => {
    const result = JSON.parse(
      execFileSync(
        turbo,
        [
          "run",
          "build",
          "--filter=@assistant-ui/docs-site",
          "--filter=@assistant-ui/core",
          "--dry=json",
        ],
        { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
      ),
    ) as { tasks: PlannedTask[] };
    return Object.fromEntries(
      result.tasks.map((task) => [task.taskId, task.hash]),
    );
  };
  const snapshot = () =>
    execFileSync(process.execPath, ["scripts/generate-source-snapshot.mts"], {
      cwd: path.join(root, "apps/docs"),
      stdio: "pipe",
    });
  const snapshotFile = (file: string) =>
    path.join(root, "apps/docs/generated/.repo-source", file);
  const before = plan();
  expect(before[docsTask]).toBeTypeOf("string");
  expect(before[coreTask]).toBeTypeOf("string");

  for (const file of [
    "examples/with-react-ink/src/app.tsx",
    "packages/core/src/input-contract.test.ts",
    "README.md",
  ]) {
    const original = readFileSync(path.join(root, file), "utf8");
    const changed = `${original}\nsource snapshot edit\n`;
    write(file, changed);
    snapshot();
    expect(readFileSync(snapshotFile(file), "utf8")).toBe(changed);
    const after = plan();
    expect(after[docsTask], file).not.toBe(before[docsTask]);
    expect(after[coreTask], file).toBe(before[coreTask]);
    write(file, original);
  }

  const added = "examples/with-react-ink/src/added.ts";
  write(added, "export const added = true;\n");
  git("add", added);
  snapshot();
  expect(readFileSync(snapshotFile(added), "utf8")).toContain("added = true");
  expect(plan()[docsTask]).not.toBe(before[docsTask]);
  git("rm", "--quiet", "--force", added);

  git("rm", "--quiet", "examples/with-react-ink/src/app.tsx");
  snapshot();
  expect(() =>
    readFileSync(snapshotFile("examples/with-react-ink/src/app.tsx")),
  ).toThrow();
  expect(plan()[docsTask]).not.toBe(before[docsTask]);
  git(
    "restore",
    "--source=HEAD",
    "--staged",
    "--worktree",
    "examples/with-react-ink/src/app.tsx",
  );

  for (const file of [
    "apps/docs/generated/.repo-source/output.ts",
    "apps/docs/.next/server/output.js",
    "packages/core/dist/output.js",
    "examples/with-react-ink/node_modules/dependency/index.js",
    ".turbo/cache/output.json",
  ]) {
    write(file, "ignored build output");
  }
  expect(plan()[docsTask]).toBe(before[docsTask]);
}, 30_000);
