import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import {
  checkBudgets,
  formatBudgetReport,
  parseRouteBundleStats,
} from "./bundle-budget.mts";

// Runs after `next build` (see the `build` script), so the Vercel build, which
// is the docs site's CI build, fails when a route goes over its budget.
const DOCS_ROOT = process.cwd();
const statsPath = path.join(
  DOCS_ROOT,
  ".next",
  "diagnostics",
  "route-bundle-stats.json",
);

const stats = parseRouteBundleStats(
  JSON.parse(readFileSync(statsPath, "utf-8")),
);
const results = checkBudgets(
  stats,
  (chunkPath) => gzipSync(readFileSync(path.join(DOCS_ROOT, chunkPath))).length,
);
const { ok, report } = formatBudgetReport(results);
console.log(report);
if (!ok) process.exit(1);
