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

// ============================================================================
// Schemas - types are derived from these using z.infer
// ============================================================================

const ScenarioInputsSchema = z.object({
  startingMRR: z.number(),
  monthlyGrowthRate: z.number(),
  monthlyChurnRate: z.number(),
  grossMargin: z.number(),
  fixedCosts: z.number(),
});

const MonthlyProjectionSchema = z.object({
  month: z.number(),
  mrr: z.number(),
  grossProfit: z.number(),
  netProfit: z.number(),
  cumulativeRevenue: z.number(),
});

const ScenarioSummarySchema = z.object({
  endingMRR: z.number(),
  arr: z.number(),
  totalRevenue: z.number(),
  totalProfit: z.number(),
  mrrGrowthPct: z.number(),
  avgMargin: z.number(),
  breakEvenMonth: z.number().nullable(),
});

const ScenarioTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  parameters: ScenarioInputsSchema,
  projections: z.array(MonthlyProjectionSchema),
  summary: ScenarioSummarySchema,
  keyInsight: z.string(),
});

const GetScenarioDataInputSchema = z.object({
  customInputs: ScenarioInputsSchema.optional().describe(
    "Custom scenario parameters to compute projections for",
  ),
});

// Types derived from schemas
type ScenarioInputs = z.infer<typeof ScenarioInputsSchema>;
type MonthlyProjection = z.infer<typeof MonthlyProjectionSchema>;
type ScenarioSummary = z.infer<typeof ScenarioSummarySchema>;
type ScenarioTemplate = z.infer<typeof ScenarioTemplateSchema>;

// ============================================================================
// Calculations
// ============================================================================

function calculateProjections(inputs: ScenarioInputs): MonthlyProjection[] {
  const {
    startingMRR,
    monthlyGrowthRate,
    monthlyChurnRate,
    grossMargin,
    fixedCosts,
  } = inputs;

  const netGrowthRate = (monthlyGrowthRate - monthlyChurnRate) / 100;
  const projections: MonthlyProjection[] = [];
  let cumulativeRevenue = 0;

  for (let month = 1; month <= 12; month++) {
    const mrr = startingMRR * Math.pow(1 + netGrowthRate, month);
    const grossProfit = mrr * (grossMargin / 100);
    const netProfit = grossProfit - fixedCosts;
    cumulativeRevenue += mrr;

    projections.push({
      month,
      mrr,
      grossProfit,
      netProfit,
      cumulativeRevenue,
    });
  }

  return projections;
}

function calculateSummary(
  projections: MonthlyProjection[],
  inputs: ScenarioInputs,
): ScenarioSummary {
  const endingMRR = projections[11].mrr;
  const arr = endingMRR * 12;
  const totalRevenue = projections.reduce((sum, p) => sum + p.mrr, 0);
  const totalProfit = projections.reduce((sum, p) => sum + p.netProfit, 0);
  const mrrGrowthPct =
    ((endingMRR - inputs.startingMRR) / inputs.startingMRR) * 100;
  const avgMargin = (totalProfit / totalRevenue) * 100;

  const breakEvenProjection = projections.find((p) => p.netProfit >= 0);
  const breakEvenMonth = breakEvenProjection?.month ?? null;

  return {
    endingMRR,
    arr,
    totalRevenue,
    totalProfit,
    mrrGrowthPct,
    avgMargin,
    breakEvenMonth,
  };
}

function calculateScenario(inputs: ScenarioInputs) {
  const projections = calculateProjections(inputs);
  const summary = calculateSummary(projections, inputs);
  return { projections, summary };
}

function buildTemplate(
  id: string,
  name: string,
  description: string,
  icon: string,
  parameters: ScenarioInputs,
  keyInsight: string,
): ScenarioTemplate {
  const { projections, summary } = calculateScenario(parameters);
  return {
    id,
    name,
    description,
    icon,
    parameters,
    projections,
    summary,
    keyInsight,
  };
}

// ============================================================================
// Pre-defined Templates
// ============================================================================

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  buildTemplate(
    "bootstrapped",
    "Bootstrapped Growth",
    "Low burn, steady growth, path to profitability",
    "🌱",
    {
      startingMRR: 30000,
      monthlyGrowthRate: 4,
      monthlyChurnRate: 2,
      grossMargin: 85,
      fixedCosts: 20000,
    },
    "Profitable by month 1, but slower scale",
  ),
  buildTemplate(
    "vc-rocketship",
    "VC Rocketship",
    "High burn, explosive growth, raise more later",
    "🚀",
    {
      startingMRR: 100000,
      monthlyGrowthRate: 15,
      monthlyChurnRate: 5,
      grossMargin: 70,
      fixedCosts: 150000,
    },
    "Loses money early but ends at 3x MRR",
  ),
  buildTemplate(
    "cash-cow",
    "Cash Cow",
    "Mature product, high margin, stable revenue",
    "🐄",
    {
      startingMRR: 80000,
      monthlyGrowthRate: 2,
      monthlyChurnRate: 1,
      grossMargin: 90,
      fixedCosts: 40000,
    },
    "Consistent profitability, low risk",
  ),
  buildTemplate(
    "turnaround",
    "Turnaround",
    "Fighting churn, rebuilding product-market fit",
    "🔄",
    {
      startingMRR: 60000,
      monthlyGrowthRate: 6,
      monthlyChurnRate: 8,
      grossMargin: 75,
      fixedCosts: 50000,
    },
    "Negative net growth requires urgent action",
  ),
  buildTemplate(
    "efficient-growth",
    "Efficient Growth",
    "Balanced approach with sustainable economics",
    "⚖️",
    {
      startingMRR: 50000,
      monthlyGrowthRate: 8,
      monthlyChurnRate: 3,
      grossMargin: 80,
      fixedCosts: 35000,
    },
    "Good growth with path to profitability",
  ),
];

const DEFAULT_INPUTS: ScenarioInputs = {
  startingMRR: 50000,
  monthlyGrowthRate: 5,
  monthlyChurnRate: 3,
  grossMargin: 80,
  fixedCosts: 30000,
};

// ============================================================================
// MCP Server
// ============================================================================

/**
 * Creates a new MCP server instance with tools and resources registered.
 * Each HTTP session needs its own server instance because McpServer only supports one transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "SaaS Scenario Modeler",
    version: "1.0.0",
  });

  // Register tool and resource
  {
    const resourceUri = "ui://scenario-modeler/mcp-app.html";

    registerAppTool(
      server,
      "get-scenario-data",
      {
        title: "Get Scenario Data",
        description:
          "Returns SaaS scenario templates and optionally computes custom projections for given inputs",
        inputSchema: GetScenarioDataInputSchema.shape,
        _meta: { [RESOURCE_URI_META_KEY]: resourceUri },
      },
      async (args: {
        customInputs?: ScenarioInputs;
      }): Promise<CallToolResult> => {
        const customScenario = args.customInputs
          ? calculateScenario(args.customInputs)
          : undefined;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                templates: SCENARIO_TEMPLATES,
                defaultInputs: DEFAULT_INPUTS,
                customProjections: customScenario?.projections,
                customSummary: customScenario?.summary,
              }),
            },
          ],
        };
      },
    );

    registerAppResource(
      server,
      resourceUri,
      resourceUri,
      { mimeType: RESOURCE_MIME_TYPE, description: "SaaS Scenario Modeler UI" },
      async (): Promise<ReadResourceResult> => {
        const html = await fs.readFile(
          path.join(DIST_DIR, "mcp-app.html"),
          "utf-8",
        );
        return {
          contents: [
            {
              uri: resourceUri,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
            },
          ],
        };
      },
    );
  }

  return server;
}

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  if (process.argv.includes("--stdio")) {
    await createServer().connect(new StdioServerTransport());
  } else {
    const port = parseInt(process.env.PORT ?? "3106", 10);
    await startServer(createServer, {
      port,
      name: "SaaS Scenario Modeler Server",
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
