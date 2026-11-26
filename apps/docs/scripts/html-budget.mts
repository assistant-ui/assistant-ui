// HTML weight budget for every prerendered page. A reader downloads and parses
// the whole document before the page is usable, and the flight data inside it
// repeats much of the markup, so one heavy prop (a page tree, a stylesheet,
// highlighted code for a hidden tab) costs twice and lands on every page that
// shares it. Pages over the budget fail the build; move the weight out of the
// document (a cached asset, a lazy fetch, a client-only render) instead of
// raising the number.
export const HTML_BUDGET_BYTES = 1_500_000;

// Pages allowed above the budget, each with its own ceiling and the reason.
// Remove an entry once the page is back under HTML_BUDGET_BYTES.
export const HTML_BUDGET_EXCEPTIONS: Record<
  string,
  { bytes: number; reason: string }
> = {
  // Measured 4.83 MB: the inline world map. assistant-ui#10883 cuts it to
  // about 1.15 MB.
  "/diagrammatic/docs/charts/dot-world-map": {
    bytes: 5_100_000,
    reason: "inline dot world map (assistant-ui#10883)",
  },
};

export type PageWeight = { route: string; bytes: number };

export type HtmlBudgetResult = PageWeight & {
  limit: number;
  over: boolean;
};

// Where `next build` leaves each prerendered page, relative to .next/server:
// `app/docs/architecture.html` for `/docs/architecture` by default, or, when a
// deployment adapter is set (as on Vercel),
// `route-cache/APP_PAGE/<source route hash>/$/docs/architecture.html`. The home
// page is `index.html` in both. Anything else is not a page.
export function routeFromServerPath(relativePath: string): string | null {
  const file = relativePath.replace(/\\/g, "/");
  if (!file.endsWith(".html")) return null;
  const rest = file.startsWith("app/")
    ? file.slice("app/".length)
    : /^route-cache\/APP_PAGE\/[^/]+\/\$\/(.+)$/.exec(file)?.[1];
  if (rest === undefined) return null;
  const withoutExt = rest.replace(/\.html$/, "");
  if (withoutExt === "index") return "/";
  return `/${withoutExt}`;
}

export function checkHtmlBudget(
  pages: readonly PageWeight[],
  budget: number = HTML_BUDGET_BYTES,
  exceptions: Record<string, { bytes: number }> = HTML_BUDGET_EXCEPTIONS,
): HtmlBudgetResult[] {
  // A route can sit in both layouts (`next start` caches pages it serves in
  // route-cache); count it once, at its largest.
  const largest = new Map<string, number>();
  for (const { route, bytes } of pages) {
    largest.set(route, Math.max(bytes, largest.get(route) ?? 0));
  }
  return [...largest]
    .map(([route, bytes]) => ({ route, bytes }))
    .sort((a, b) => b.bytes - a.bytes || a.route.localeCompare(b.route))
    .map((page) => {
      const limit = exceptions[page.route]?.bytes ?? budget;
      return { ...page, limit, over: page.bytes > limit };
    });
}

const MB = (bytes: number) => `${(bytes / 1_000_000).toFixed(2)} MB`;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function formatHtmlBudgetReport(
  results: readonly HtmlBudgetResult[],
  {
    budget = HTML_BUDGET_BYTES,
    heaviest = 10,
    exceptions = HTML_BUDGET_EXCEPTIONS,
  }: {
    budget?: number;
    heaviest?: number;
    exceptions?: Record<string, { bytes: number }>;
  } = {},
): { ok: boolean; report: string } {
  const lines: string[] = [];
  if (results.length === 0) {
    return {
      ok: false,
      report:
        "Prerendered HTML against budget: no prerendered pages found under .next/server.",
    };
  }
  const sizes = results.map((r) => r.bytes);
  const over = results.filter((r) => r.over);
  const top = results.slice(0, heaviest);
  const topTotal = results
    .slice(0, 25)
    .reduce((total, r) => total + r.bytes, 0);
  lines.push(
    `Prerendered HTML against budget (${MB(budget)} per page): ${results.length} pages, median ${MB(median(sizes))}, max ${MB(sizes[0]!)}, heaviest 25 total ${MB(topTotal)}`,
    `Heaviest ${top.length}:`,
  );
  for (const r of top) {
    lines.push(
      `  ${r.over ? "OVER   " : "ok     "}  ${MB(r.bytes)}  ${r.route}${r.limit !== budget ? ` (allowed ${MB(r.limit)})` : ""}`,
    );
  }
  for (const r of over.filter((r) => !top.includes(r))) {
    lines.push(`  OVER     ${MB(r.bytes)}  ${r.route}`);
  }
  const stale = Object.keys(exceptions).filter((route) => {
    const page = results.find((r) => r.route === route);
    return !page || page.bytes <= budget;
  });
  // A warning, not a failure: the change that fixes a page should not have
  // to know about this list to pass.
  for (const route of stale) {
    lines.push(
      `  STALE    ${route}: under the budget or gone; remove it from HTML_BUDGET_EXCEPTIONS`,
    );
  }
  const ok = over.length === 0;
  if (!ok && over.length > 0) {
    lines.push(
      "",
      "A page is over its HTML budget. Build locally, open its file under",
      ".next/server/app and find the largest self.__next_f.push rows and inline",
      "<svg>/<style> blocks;",
      "then move that weight out of the document: a cached stylesheet or asset,",
      "a fetch when the reader asks for it, or a client-only render. Add an",
      "exception in scripts/html-budget.mts only with a reason and a follow-up.",
    );
  }
  return { ok, report: lines.join("\n") };
}
