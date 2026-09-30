import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./check-built-declarations.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const WORKSPACE_ROOTS = ["packages", "apps", "examples", "templates"];
const METRICS = ["lines", "statements", "functions", "branches"];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

export function collectCoverageSummaries(root = repoRoot) {
  return WORKSPACE_ROOTS.flatMap((workspaceRoot) => {
    const dir = path.join(root, workspaceRoot);
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name))
      .filter((workspaceDir) =>
        existsSync(path.join(workspaceDir, "coverage/coverage-summary.json")),
      )
      .map((workspaceDir) => ({
        name: readJson(path.join(workspaceDir, "package.json")).name,
        total: readJson(
          path.join(workspaceDir, "coverage/coverage-summary.json"),
        ).total,
      }));
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function combine(summaries) {
  return Object.fromEntries(
    METRICS.map((metric) => {
      const covered = summaries.reduce(
        (sum, { total }) => sum + total[metric].covered,
        0,
      );
      const total = summaries.reduce(
        (sum, { total }) => sum + total[metric].total,
        0,
      );
      return [
        metric,
        { covered, total, pct: total === 0 ? 100 : (covered / total) * 100 },
      ];
    }),
  );
}

const formatPct = (pct) => `${Number(pct).toFixed(1)}%`;

export function renderCoverageMarkdown(summaries) {
  if (summaries.length === 0) {
    return "## Test coverage\n\nNo changed package produced a coverage report.\n";
  }

  const header = `| Package | ${METRICS.map((m) => m[0].toUpperCase() + m.slice(1)).join(" | ")} |`;
  const divider = `| --- | ${METRICS.map(() => "---:").join(" | ")} |`;
  const row = (name, total) =>
    `| ${name} | ${METRICS.map((m) => formatPct(total[m].pct)).join(" | ")} |`;

  const rows = summaries.map(({ name, total }) => row(`\`${name}\``, total));
  if (summaries.length > 1) rows.push(row("**All**", combine(summaries)));

  return `## Test coverage\n\n${[header, divider, ...rows].join("\n")}\n`;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const reportIndex = process.argv.indexOf("--report");
  const markdown = renderCoverageMarkdown(collectCoverageSummaries());
  if (reportIndex === -1) {
    process.stdout.write(markdown);
  } else {
    writeFileSync(process.argv[reportIndex + 1], markdown);
  }
}
