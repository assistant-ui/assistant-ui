import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

/**
 * Create a temporary repository with package manifests and optional coverage
 * totals keyed by workspace path. The caller must remove the returned directory.
 */
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

test("renders one row per package and a combined row weighted by size", () => {
  const markdown = renderCoverageMarkdown([
    { name: "a", total: totals(1, 2) },
    { name: "b", total: totals(8, 8) },
  ]);
  assert.match(markdown, /\| `a` \| 50\.0% \| 50\.0% \| 50\.0% \| 50\.0% \|/);
  assert.match(markdown, /\| `b` \| 100\.0% /);
  assert.match(markdown, /\| \*\*All\*\* \| 90\.0% /);
});

test("omits the combined row for a single package", () => {
  const markdown = renderCoverageMarkdown([{ name: "a", total: totals(1, 2) }]);
  assert.doesNotMatch(markdown, /\*\*All\*\*/);
});

test("says so when no package produced a report", () => {
  assert.match(renderCoverageMarkdown([]), /No changed package/);
});
