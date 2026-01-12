/**
 * Budget Allocator MCP Server
 *
 * Provides budget configuration, 24 months of historical allocation data,
 * and industry benchmarks by company stage.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { startServer } from "./server-utils.js";

const DIST_DIR = path.join(import.meta.dirname, "dist");

// ---------------------------------------------------------------------------
// Schemas - types are derived from these using z.infer
// ---------------------------------------------------------------------------

const BudgetCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  defaultPercent: z.number(),
});

const HistoricalMonthSchema = z.object({
  month: z.string(),
  allocations: z.record(z.string(), z.number()),
});

const BenchmarkPercentilesSchema = z.object({
  p25: z.number(),
  p50: z.number(),
  p75: z.number(),
});

const StageBenchmarkSchema = z.object({
  stage: z.string(),
  categoryBenchmarks: z.record(z.string(), BenchmarkPercentilesSchema),
});

const BudgetConfigSchema = z.object({
  categories: z.array(BudgetCategorySchema),
  presetBudgets: z.array(z.number()),
  defaultBudget: z.number(),
  currency: z.string(),
  currencySymbol: z.string(),
});

const BudgetAnalyticsSchema = z.object({
  history: z.array(HistoricalMonthSchema),
  benchmarks: z.array(StageBenchmarkSchema),
  stages: z.array(z.string()),
  defaultStage: z.string(),
});

const BudgetDataResponseSchema = z.object({
  config: BudgetConfigSchema,
  analytics: BudgetAnalyticsSchema,
});

// Types derived from schemas
type BudgetDataResponse = z.infer<typeof BudgetDataResponseSchema>;
type HistoricalMonth = z.infer<typeof HistoricalMonthSchema>;
type StageBenchmark = z.infer<typeof StageBenchmarkSchema>;

// Internal type (not part of API schema - includes trendPerMonth for data generation)
type BudgetCategoryInternal = z.infer<typeof BudgetCategorySchema> & {
  trendPerMonth: number;
};

// ---------------------------------------------------------------------------
// Budget Categories with Trend Data
// ---------------------------------------------------------------------------

const CATEGORIES: BudgetCategoryInternal[] = [
  {
    id: "marketing",
    name: "Marketing",
    color: "#3b82f6",
    defaultPercent: 25,
    trendPerMonth: 0.15,
  },
  {
    id: "engineering",
    name: "Engineering",
    color: "#10b981",
    defaultPercent: 35,
    trendPerMonth: -0.1,
  },
  {
    id: "operations",
    name: "Operations",
    color: "#f59e0b",
    defaultPercent: 15,
    trendPerMonth: 0.05,
  },
  {
    id: "sales",
    name: "Sales",
    color: "#ef4444",
    defaultPercent: 15,
    trendPerMonth: 0.08,
  },
  {
    id: "rd",
    name: "R&D",
    color: "#8b5cf6",
    defaultPercent: 10,
    trendPerMonth: -0.18,
  },
];

// ---------------------------------------------------------------------------
// Industry Benchmarks by Company Stage
// ---------------------------------------------------------------------------

const BENCHMARKS: StageBenchmark[] = [
  {
    stage: "Seed",
    categoryBenchmarks: {
      marketing: { p25: 15, p50: 20, p75: 25 },
      engineering: { p25: 40, p50: 47, p75: 55 },
      operations: { p25: 8, p50: 12, p75: 15 },
      sales: { p25: 10, p50: 15, p75: 20 },
      rd: { p25: 5, p50: 10, p75: 15 },
    },
  },
  {
    stage: "Series A",
    categoryBenchmarks: {
      marketing: { p25: 20, p50: 25, p75: 30 },
      engineering: { p25: 35, p50: 40, p75: 45 },
      operations: { p25: 10, p50: 14, p75: 18 },
      sales: { p25: 15, p50: 20, p75: 25 },
      rd: { p25: 8, p50: 12, p75: 15 },
    },
  },
  {
    stage: "Series B",
    categoryBenchmarks: {
      marketing: { p25: 22, p50: 27, p75: 32 },
      engineering: { p25: 30, p50: 35, p75: 40 },
      operations: { p25: 12, p50: 16, p75: 20 },
      sales: { p25: 18, p50: 23, p75: 28 },
      rd: { p25: 8, p50: 12, p75: 15 },
    },
  },
  {
    stage: "Growth",
    categoryBenchmarks: {
      marketing: { p25: 25, p50: 30, p75: 35 },
      engineering: { p25: 25, p50: 30, p75: 35 },
      operations: { p25: 15, p50: 18, p75: 22 },
      sales: { p25: 20, p50: 25, p75: 30 },
      rd: { p25: 5, p50: 8, p75: 12 },
    },
  },
];

// ---------------------------------------------------------------------------
// Historical Data Generation
// ---------------------------------------------------------------------------

/**
 * Seeded random number generator for reproducible historical data
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Generate 24 months of historical allocation data with realistic trends
 */
function generateHistory(
  categories: BudgetCategoryInternal[],
): HistoricalMonth[] {
  const months: HistoricalMonth[] = [];
  const now = new Date();
  const random = seededRandom(42); // Fixed seed for reproducibility

  for (let i = 23; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const rawAllocations: Record<string, number> = {};

    for (const cat of categories) {
      // Start from default, apply trend over time, add noise
      const monthsFromStart = 23 - i;
      const trend = monthsFromStart * cat.trendPerMonth;
      const noise = (random() - 0.5) * 3; // +/- 1.5%
      rawAllocations[cat.id] = Math.max(
        0,
        Math.min(100, cat.defaultPercent + trend + noise),
      );
    }

    // Normalize to 100%
    const total = Object.values(rawAllocations).reduce((a, b) => a + b, 0);
    const allocations: Record<string, number> = {};
    for (const id of Object.keys(rawAllocations)) {
      allocations[id] = Math.round((rawAllocations[id] / total) * 1000) / 10;
    }

    months.push({ month: monthStr, allocations });
  }

  return months;
}

// ---------------------------------------------------------------------------
// MCP Server Setup
// ---------------------------------------------------------------------------

const resourceUri = "ui://budget-allocator/mcp-app.html";

/**
 * Creates a new MCP server instance with tools and resources registered.
 * Each HTTP session needs its own server instance because McpServer only supports one transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "Budget Allocator Server",
    version: "1.0.0",
  });

  registerAppTool(
    server,
    "get-budget-data",
    {
      title: "Get Budget Data",
      description:
        "Returns budget configuration with 24 months of historical allocations and industry benchmarks by company stage",
      inputSchema: {},
      _meta: { [RESOURCE_URI_META_KEY]: resourceUri },
    },
    async (): Promise<CallToolResult> => {
      const response: BudgetDataResponse = {
        config: {
          categories: CATEGORIES.map(({ id, name, color, defaultPercent }) => ({
            id,
            name,
            color,
            defaultPercent,
          })),
          presetBudgets: [50000, 100000, 250000, 500000],
          defaultBudget: 100000,
          currency: "USD",
          currencySymbol: "$",
        },
        analytics: {
          history: generateHistory(CATEGORIES),
          benchmarks: BENCHMARKS,
          stages: ["Seed", "Series A", "Series B", "Growth"],
          defaultStage: "Series A",
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response),
          },
        ],
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: "Interactive Budget Allocator UI",
    },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );
      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

async function main() {
  if (process.argv.includes("--stdio")) {
    await createServer().connect(new StdioServerTransport());
  } else {
    const port = parseInt(process.env.PORT ?? "3103", 10);
    await startServer(createServer, { port, name: "Budget Allocator Server" });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
