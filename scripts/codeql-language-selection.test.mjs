import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/codeql.yaml", import.meta.url),
  "utf8",
);
const selection = workflow
  .match(
    /      - name: Select language[\s\S]*?        run: \|\n([\s\S]*?)(?=\n      - name:)/,
  )[1]
  .replace(/^          /gm, "");
const languages = ["actions", "javascript-typescript", "python"];

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-codeql-selection-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.com",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.com",
  };
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, env, encoding: "utf8" }).trim();
  const write = (file, text = "fixture\n") => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  const commit = () => {
    git("add", ".");
    git("commit", "-qm", "fixture");
  };
  // The languages a pull request whose merge commit is HEAD would analyze.
  const selected = () =>
    languages.filter((language) => {
      const output = path.join(root, ".git", "selection-output");
      writeFileSync(output, "");
      const result = spawnSync("bash", ["-c", selection], {
        cwd: root,
        encoding: "utf8",
        env: { ...env, LANGUAGE: language, GITHUB_OUTPUT: output },
      });
      assert.equal(result.status, 0, result.stderr);
      return readFileSync(output, "utf8").trim() === "run=true";
    });
  git("init", "-q");
  write("python/assistant-stream/module.py");
  return { root, write, commit, selected };
}

const cases = [
  ["package source", ["packages/core/src/index.ts"], ["javascript-typescript"]],
  ["a Python package", ["python/assistant-stream/new.py"], ["python"]],
  ["Python in an example", ["examples/with-ag-ui/server/agent.py"], ["python"]],
  ["a workflow", [".github/workflows/code-quality.yaml"], ["actions"]],
  [
    "action metadata outside the workflows folder",
    ["packages/core/action.yml", "tools/setup/action.yaml"],
    ["actions", "javascript-typescript"],
  ],
  ["the CodeQL workflow", [".github/workflows/codeql.yaml"], languages],
  [
    "Python next to Markdown",
    ["python/assistant-stream/new.py", "README.md", "apps/docs/guide.mdx"],
    ["python"],
  ],
  ["Python project metadata", ["python/assistant-stream/pyproject.toml"], []],
  ["Markdown", ["README.md", "apps/docs/guide.mdx"], []],
  ["a filename with whitespace", ["examples/a b\nc/agent.py"], ["python"]],
];

for (const [name, files, expected] of cases) {
  test(`${name} selects ${expected.join(", ") || "nothing"}`, (t) => {
    const f = fixture(t);
    f.commit();
    for (const file of files) f.write(file);
    f.commit();
    assert.deepEqual(f.selected(), expected);
  });
}

test("a deleted file still selects its language", (t) => {
  const f = fixture(t);
  f.commit();
  rmSync(path.join(f.root, "python/assistant-stream/module.py"));
  f.commit();
  assert.deepEqual(f.selected(), ["python"]);
});

test("a missing base commit analyzes every language", (t) => {
  const f = fixture(t);
  f.commit();
  assert.deepEqual(f.selected(), languages);
});
