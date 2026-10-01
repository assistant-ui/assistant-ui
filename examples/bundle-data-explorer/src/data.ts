export const regions = ["North America", "Europe", "Asia Pacific"] as const;
export type Region = (typeof regions)[number];
export type RegionFilter = Region | "All regions";
export type Grouping = "month" | "region";

export type Sale = {
  month: string;
  region: Region;
  revenue: number;
  orders: number;
};

export const sales: Sale[] = [
  { month: "Jan", region: "North America", revenue: 12400, orders: 124 },
  { month: "Jan", region: "Europe", revenue: 8200, orders: 82 },
  { month: "Jan", region: "Asia Pacific", revenue: 6100, orders: 61 },
  { month: "Feb", region: "North America", revenue: 13100, orders: 131 },
  { month: "Feb", region: "Europe", revenue: 8900, orders: 89 },
  { month: "Feb", region: "Asia Pacific", revenue: 6600, orders: 66 },
  { month: "Mar", region: "North America", revenue: 12800, orders: 128 },
  { month: "Mar", region: "Europe", revenue: 9700, orders: 97 },
  { month: "Mar", region: "Asia Pacific", revenue: 7200, orders: 72 },
  { month: "Apr", region: "North America", revenue: 14200, orders: 142 },
  { month: "Apr", region: "Europe", revenue: 10400, orders: 104 },
  { month: "Apr", region: "Asia Pacific", revenue: 8100, orders: 81 },
  { month: "May", region: "North America", revenue: 14900, orders: 149 },
  { month: "May", region: "Europe", revenue: 11800, orders: 118 },
  { month: "May", region: "Asia Pacific", revenue: 9300, orders: 93 },
  { month: "Jun", region: "North America", revenue: 15800, orders: 158 },
  { month: "Jun", region: "Europe", revenue: 12700, orders: 127 },
  { month: "Jun", region: "Asia Pacific", revenue: 10600, orders: 106 },
];

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function summarize(rows: readonly Sale[], grouping: Grouping) {
  const result = new Map<
    string,
    { label: string; revenue: number; orders: number }
  >();
  for (const row of rows) {
    const label = row[grouping];
    const current = result.get(label) ?? { label, revenue: 0, orders: 0 };
    current.revenue += row.revenue;
    current.orders += row.orders;
    result.set(label, current);
  }
  return Array.from(result.values());
}

export function filterSales(filter: RegionFilter) {
  return filter === "All regions"
    ? sales
    : sales.filter((row) => row.region === filter);
}

export type QueryResult = {
  text: string;
  filter?: RegionFilter;
  grouping?: Grouping;
};

const supportedQueryWords = new Set(
  "a across all america an and are as asia at best bring brings by can change changed changes changing clear compare comparison complete dataset did do does europe everything filter filters focus for from generate generated grew grow growing growth had has have highest how i in increase increased increasing is it its leading market markets me month monthly months most my north of on only or orders our pacific please region regional regions reset revenue sales sample show showing studio sum that the these this top total totals trend trends us was were what whats which whole with you".split(
    " ",
  ),
);

const unsupportedQuestion =
  "This local demo supports revenue totals, region comparisons, region filters, monthly views, and January-to-June growth. Available regions are North America, Europe, and Asia Pacific. Try ‘Which region has the most revenue?’, ‘Focus on Europe’, or ‘How did revenue grow?’ I only use the 18 fictional records shown here; I can't infer causes or access other data. Your current view is unchanged.";

export function answerQuery(prompt: string): QueryResult {
  const query = prompt.toLowerCase();
  if (
    /\b(why|causes?|caused|causing|reasons?|drivers?|driving|drove|because|responsible)\b|\bled to\b|\bdue to\b|\bwhat explains\b/.test(
      query,
    )
  ) {
    return {
      text: "I can't infer causes or access other data. These fictional sample records contain revenue and order counts only; they don't explain why a result changed. Your current view is unchanged.",
    };
  }
  const words = query.replaceAll(/[’']/g, "").match(/[a-z]+/g) ?? [];
  const withoutRegions = regions.reduce(
    (text, region) => text.replaceAll(region.toLowerCase(), ""),
    query,
  );
  if (
    words.some((word) => !supportedQueryWords.has(word)) ||
    /\d/.test(query) ||
    /\b(north|america|asia|pacific)\b/.test(withoutRegions)
  ) {
    return { text: unsupportedQuestion };
  }
  const mentioned = regions.find((region) =>
    query.includes(region.toLowerCase()),
  );
  const totals = summarize(sales, "region").sort(
    (a, b) => b.revenue - a.revenue,
  );
  const totalRevenue = sales.reduce((sum, row) => sum + row.revenue, 0);

  if (/reset|all regions|show everything|clear filter/.test(query)) {
    return {
      text: `Showing all 18 sample records again. Total revenue is ${money(totalRevenue)} across ${sales.reduce((sum, row) => sum + row.orders, 0).toLocaleString("en-US")} orders.`,
      filter: "All regions",
      grouping: "month",
    };
  }
  if (
    /top|most|highest|best|leading/.test(query) &&
    /region|market/.test(query)
  ) {
    const leader = totals[0]!;
    return {
      text: `${leader.label} leads with ${money(leader.revenue)} in sample revenue, ${((leader.revenue / totalRevenue) * 100).toFixed(1)}% of the total. Europe has ${money(totals.find((row) => row.label === "Europe")!.revenue)} and Asia Pacific has ${money(totals.find((row) => row.label === "Asia Pacific")!.revenue)}. I've changed the chart to compare regions.`,
      filter: "All regions",
      grouping: "region",
    };
  }
  if (/compare|by region|regional/.test(query)) {
    return {
      text: `Sample revenue by region: ${totals.map((row) => `${row.label} ${money(row.revenue)}`).join("; ")}. The chart now compares the three regions.`,
      filter: "All regions",
      grouping: "region",
    };
  }
  if (mentioned && /show|focus|filter|only|revenue|orders/.test(query)) {
    const rows = filterSales(mentioned);
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const orders = rows.reduce((sum, row) => sum + row.orders, 0);
    return {
      text: `${mentioned} generated ${money(revenue)} from ${orders.toLocaleString("en-US")} sample orders, January through June. The chart and source table now show its six records.`,
      filter: mentioned,
      grouping: "month",
    };
  }
  if (/grow|grew|change|increase|trend/.test(query)) {
    const months = summarize(sales, "month");
    const first = months[0]!;
    const last = months[months.length - 1]!;
    return {
      text: `Across all regions, monthly sample revenue increased from ${money(first.revenue)} in January to ${money(last.revenue)} in June: ${money(last.revenue - first.revenue)}, or ${((last.revenue / first.revenue - 1) * 100).toFixed(1)}%. This is a January-to-June comparison, not a forecast. I've restored the monthly view across all regions.`,
      filter: "All regions",
      grouping: "month",
    };
  }
  if (/monthly|by month|months/.test(query)) {
    return {
      text: `Monthly sample revenue: ${summarize(sales, "month")
        .map((row) => `${row.label} ${money(row.revenue)}`)
        .join("; ")}. I've restored the monthly chart across all regions.`,
      filter: "All regions",
      grouping: "month",
    };
  }
  if (/total|sum/.test(query) && /revenue|sales|orders/.test(query)) {
    return {
      text: `The complete sample contains ${money(totalRevenue)} in revenue and ${sales.reduce((sum, row) => sum + row.orders, 0).toLocaleString("en-US")} orders. Each row represents one region in one month.`,
    };
  }
  return {
    text: unsupportedQuestion,
  };
}
