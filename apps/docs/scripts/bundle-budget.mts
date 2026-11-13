// First-load JS budgets, in gzipped bytes, for the routes most visitors land
// on. A route's first-load chunks are the union over every page it serves, so
// one static import of a heavy library in shared code (an MDX sample, the Ask
// AI runtime, the header) lands on every page of that route. The budgets sit
// about 5% above the measured size; when a route goes over, load the new code
// with next/dynamic or React.lazy instead of raising the number.
export const FIRST_LOAD_JS_BUDGETS: Record<string, number> = {
  // Measured 881 kB.
  "/": 925_000,
  // Measured 1,033 kB. Every /docs page loads this.
  "/docs/[[...slug]]": 1_085_000,
  // Measured 1,036 kB.
  "/[site]/docs/[[...slug]]": 1_088_000,
  // Measured 979 kB. Each element page loads only its own demo and states
  // through element-demos.tsx; a static demo import puts all of them back.
  "/elements/[slug]": 1_028_000,
  // Measured 400 kB. Demos load as their cards scroll into view.
  "/elements": 420_000,
  // Measured 193 kB. The shell every page shares.
  "/_not-found": 203_000,
};

export type RouteBundleStat = {
  route: string;
  firstLoadChunkPaths: string[];
};

export type BudgetResult = {
  route: string;
  gzipBytes: number | null;
  budget: number;
};

export function parseRouteBundleStats(json: unknown): RouteBundleStat[] {
  if (!Array.isArray(json)) {
    throw new Error("route-bundle-stats.json is not an array");
  }
  return json.map((entry: unknown) => {
    if (
      entry === null ||
      typeof entry !== "object" ||
      !("route" in entry) ||
      typeof entry.route !== "string" ||
      !("firstLoadChunkPaths" in entry) ||
      !Array.isArray(entry.firstLoadChunkPaths) ||
      !entry.firstLoadChunkPaths.every((chunk) => typeof chunk === "string")
    ) {
      throw new Error("route-bundle-stats.json has an unexpected entry");
    }
    return {
      route: entry.route,
      firstLoadChunkPaths: entry.firstLoadChunkPaths as string[],
    };
  });
}

export function checkBudgets(
  stats: RouteBundleStat[],
  gzipSize: (chunkPath: string) => number,
  budgets: Record<string, number> = FIRST_LOAD_JS_BUDGETS,
): BudgetResult[] {
  return Object.entries(budgets).map(([route, budget]) => {
    const stat = stats.find((entry) => entry.route === route);
    const gzipBytes = stat
      ? stat.firstLoadChunkPaths.reduce(
          (total, chunkPath) => total + gzipSize(chunkPath),
          0,
        )
      : null;
    return { route, gzipBytes, budget };
  });
}

const kB = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`;

export function formatBudgetReport(results: BudgetResult[]): {
  ok: boolean;
  report: string;
} {
  const lines = ["First-load JS (gzip) against budget:"];
  let ok = true;
  for (const { route, gzipBytes, budget } of results) {
    if (gzipBytes === null) {
      ok = false;
      lines.push(`  MISSING  ${route}: not in route-bundle-stats.json`);
      continue;
    }
    const over = gzipBytes > budget;
    if (over) ok = false;
    lines.push(
      `  ${over ? "OVER   " : "ok     "}  ${route}: ${kB(gzipBytes)} / ${kB(budget)}`,
    );
  }
  if (!ok) {
    lines.push(
      "",
      "A route is over its first-load JS budget or missing from the build stats.",
      "Find the new static import of a heavy module and load it with next/dynamic",
      "or React.lazy where it renders. Raise the budget in scripts/bundle-budget.mts",
      "only when the extra code is needed for first paint on every page of the route.",
    );
  }
  return { ok, report: lines.join("\n") };
}
