import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
import {
  collectCoverageSummaries,
  renderCoverageMarkdown,
} from "./coverage-summary.mjs";

const metric = (covered, total) => ({
  covered,
  total,
  pct: (covered / total) * 100,
});

const totals = (covered, total) => ({
  lines: metric(covered, total),
  statements: metric(covered, total),
  functions: metric(covered, total),
  branches: metric(covered, total),
});

function createRepo(workspaces) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-coverage-summary-"));
  for (const [dir, { name, total }] of Object.entries(workspaces)) {
    mkdirSync(path.join(root, dir), { recursive: true });
    writeFileSync(
      path.join(root, dir, "package.json"),
      JSON.stringify({ name }),
    );
    if (total) {
      mkdirSync(path.join(root, dir, "coverage"));
      writeFileSync(
        path.join(root, dir, "coverage/coverage-summary.json"),
        JSON.stringify({ total }),
      );
    }
  }
  return root;
}

test("collects only workspaces that wrote a coverage summary, sorted by name", () => {
  const root = createRepo({
    "packages/react": { name: "@assistant-ui/react", total: totals(3, 4) },
    "packages/core": { name: "@assistant-ui/core", total: totals(1, 2) },
    "packages/untested": { name: "@assistant-ui/untested" },
    "examples/with-x": { name: "with-x", total: totals(1, 1) },
  });
  try {
    assert.deepEqual(
      collectCoverageSummaries(root).map(({ name }) => name),
      ["@assistant-ui/core", "@assistant-ui/react", "with-x"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("skips leftover coverage from a workspace that no longer has a package.json", () => {
  const root = createRepo({
    "packages/core": { name: "@assistant-ui/core", total: totals(1, 2) },
  });
  try {
    mkdirSync(path.join(root, "packages/removed/coverage"), {
      recursive: true,
    });
    writeFileSync(
      path.join(root, "packages/removed/coverage/coverage-summary.json"),
      JSON.stringify({ total: totals(1, 2) }),
    );
    assert.deepEqual(
      collectCoverageSummaries(root).map(({ name }) => name),
      ["@assistant-ui/core"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renders one row per package and a combined row weighted by size", () => {
  const markdown = renderCoverageMarkdown([
    { name: "a", total: totals(1, 2) },
    { name: "b", total: totals(8, 8) },
  ]);
  assert.match(markdown, /\| `a` \| 50\.0% \| 50\.0% \| 50\.0% \| 50\.0% \|/);
  assert.match(markdown, /\| `b` \| 100\.0% /);
  assert.match(markdown, /\| \*\*All\*\* \| 90\.0% /);
});

test("shows N/A for a metric with nothing to measure", () => {
  const empty = { covered: 0, total: 0, pct: "Unknown" };
  const markdown = renderCoverageMarkdown([
    {
      name: "a",
      total: {
        lines: empty,
        statements: empty,
        functions: empty,
        branches: empty,
      },
    },
    { name: "b", total: { ...totals(1, 2), branches: empty } },
  ]);
  assert.match(markdown, /\| `a` \| N\/A \| N\/A \| N\/A \| N\/A \|/);
  assert.match(markdown, /\| `b` \| 50\.0% \| 50\.0% \| 50\.0% \| N\/A \|/);
  assert.match(
    markdown,
    /\| \*\*All\*\* \| 50\.0% \| 50\.0% \| 50\.0% \| N\/A \|/,
  );
  assert.doesNotMatch(markdown, /NaN/);
});

test("omits the combined row for a single package", () => {
  const markdown = renderCoverageMarkdown([{ name: "a", total: totals(1, 2) }]);
  assert.doesNotMatch(markdown, /\*\*All\*\*/);
});

test("says so when no package wrote a report", () => {
  assert.match(
    renderCoverageMarkdown([]),
    /No package wrote a coverage report/,
  );
});

const runScript = (root, args) =>
  spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, "coverage-summary.mjs"), ...args],
    {
      encoding: "utf8",
      env: { ...process.env, COVERAGE_SUMMARY_ROOT: root },
    },
  );

test("prints the table, or writes it where --report points, however pnpm passes the flag", () => {
  const root = createRepo({
    "packages/core": { name: "@assistant-ui/core", total: totals(1, 2) },
  });
  try {
    const printed = runScript(root, []);
    assert.equal(printed.status, 0);
    assert.match(printed.stdout, /`@assistant-ui\/core` \| 50\.0%/);

    const a = path.join(root, "a.md");
    const b = path.join(root, "b.md");
    const c = path.join(root, "c.md");
    for (const [file, args] of [
      [a, ["--report", a]],
      [b, ["--", "--report", b]],
      [c, [`--report=${c}`]],
    ]) {
      const result = runScript(root, args);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "");
      assert.equal(readFileSync(file, "utf8"), printed.stdout);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when --report has no path", () => {
  const root = createRepo({});
  try {
    const result = runScript(root, ["--report"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing value for --report/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
