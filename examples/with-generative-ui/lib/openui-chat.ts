import {
  openuiLibrary,
  openuiPromptOptions,
} from "@openuidev/react-ui/genui-lib";

const MARKET_REPORT_EXAMPLE = `Example — Dashboard with KPI cards, table, and grouped bar chart:

root = Stack([header, kpis, tbl, chart])
header = CardHeader("AI Market Report", "Funding and growth snapshot")
kpis = Stack([kpi1, kpi2, kpi3], "row", true)
kpi1 = Card([TextContent("Market Growth (CAGR)", "small"), TextContent("22.4%", "large-heavy"), TextContent("2026–2030 forecast", "small")])
kpi2 = Card([TextContent("Enterprise Adoption", "small"), TextContent("61%", "large-heavy"), TextContent("by 2030", "small")])
kpi3 = Card([TextContent("Funding (2025)", "small"), TextContent("$38.6B", "large-heavy"), TextContent("+28% YoY", "small")])
tbl = Table([Col("Segment", segs), Col("Funding ($B)", funds, "number"), Col("Share", shares)])
segs = ["Models", "Infrastructure", "Enterprise Apps"]
funds = [34.6, 28.2, 18.8]
shares = ["34%", "28%", "19%"]
chart = BarChart(labels, [s1, s2], "grouped")
labels = ["Q1", "Q2", "Q3", "Q4"]
s1 = Series("Models", [80, 92, 105, 118])
s2 = Series("Apps", [60, 68, 75, 88])`;

/** System prompt tuned for visual dashboards, not markdown reports. */
export const openuiChatSystemPrompt = openuiLibrary.prompt({
  ...openuiPromptOptions,
  preamble:
    "You are a generative UI assistant inside a chat app. " +
    "When the user asks for UI, dashboards, charts, forms, tables, or tabs, " +
    "respond ONLY in OpenUI Lang. No markdown prose, no code fences, no bullet-list essays. " +
    "Your entire response must be valid openui-lang starting with root = Stack(...).",
  additionalRules: [
    ...(openuiPromptOptions.additionalRules ?? []),
    "Never use MarkDownRenderer.",
    "Never use SectionBlock, ListBlock, or collapsible accordions unless the user explicitly asks for FAQ-style sections.",
    "For KPIs: horizontal Stack of Card components with TextContent — not markdown lists.",
    "When the user asks for charts or tables, you MUST emit BarChart/Table components with real array data.",
    "Use CardHeader for titles, not markdown headings.",
    "Never wrap openui-lang in ``` fences.",
    "Omit prose replies when the UI alone answers the request.",
  ],
  examples: [...(openuiPromptOptions.examples ?? []), MARKET_REPORT_EXAMPLE],
});
