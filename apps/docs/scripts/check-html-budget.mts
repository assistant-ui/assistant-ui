import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  checkHtmlBudget,
  formatHtmlBudgetReport,
  routeFromServerPath,
  type PageWeight,
} from "./html-budget.mts";

// Runs after `next build` (see the `build` script), next to the JS bundle
// budget, so the Vercel build, which is the docs site's CI build, fails when a
// prerendered page goes over its HTML budget.
const SERVER_DIR = path.join(process.cwd(), ".next", "server");

function collectPages(dir: string, pages: PageWeight[]): PageWeight[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectPages(full, pages);
      continue;
    }
    const route = routeFromServerPath(path.relative(SERVER_DIR, full));
    if (route === null) continue;
    const bytes = statSync(full).size;
    // Dynamic routes leave an empty placeholder next to their prerenders.
    if (bytes === 0) continue;
    pages.push({ route, bytes });
  }
  return pages;
}

const results = checkHtmlBudget(collectPages(SERVER_DIR, []));
const { ok, report } = formatHtmlBudgetReport(results);
console.log(report);
if (!ok) process.exitCode = 1;
