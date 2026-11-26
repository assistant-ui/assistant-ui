import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  checkHtmlBudget,
  formatHtmlBudgetReport,
  routeFromHtmlPath,
  type PageWeight,
} from "./html-budget.mts";

// Runs after `next build` (see the `build` script), next to the JS bundle
// budget, so the Vercel build, which is the docs site's CI build, fails when a
// prerendered page goes over its HTML budget.
const APP_DIR = path.join(process.cwd(), ".next", "server", "app");

function collectPages(dir: string, pages: PageWeight[]): PageWeight[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectPages(full, pages);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const bytes = statSync(full).size;
    // Dynamic routes leave an empty placeholder next to their prerenders.
    if (bytes === 0) continue;
    pages.push({
      route: routeFromHtmlPath(path.relative(APP_DIR, full)),
      bytes,
    });
  }
  return pages;
}

const results = checkHtmlBudget(collectPages(APP_DIR, []));
const { ok, report } = formatHtmlBudgetReport(results);
console.log(report);
if (!ok) process.exitCode = 1;
