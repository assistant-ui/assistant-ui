import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
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

// Schemas - types are derived from these using z.infer
const GetCohortDataInputSchema = z.object({
  metric: z
    .enum(["retention", "revenue", "active"])
    .optional()
    .default("retention"),
  periodType: z.enum(["monthly", "weekly"]).optional().default("monthly"),
  cohortCount: z.number().min(3).max(24).optional().default(12),
  maxPeriods: z.number().min(3).max(24).optional().default(12),
});

const CohortCellSchema = z.object({
  cohortIndex: z.number(),
  periodIndex: z.number(),
  retention: z.number(),
  usersRetained: z.number(),
  usersOriginal: z.number(),
});

const CohortRowSchema = z.object({
  cohortId: z.string(),
  cohortLabel: z.string(),
  originalUsers: z.number(),
  cells: z.array(CohortCellSchema),
});

const CohortDataSchema = z.object({
  cohorts: z.array(CohortRowSchema),
  periods: z.array(z.string()),
  periodLabels: z.array(z.string()),
  metric: z.string(),
  periodType: z.string(),
  generatedAt: z.string(),
});

// Types derived from schemas
type CohortCell = z.infer<typeof CohortCellSchema>;
type CohortRow = z.infer<typeof CohortRowSchema>;
type CohortData = z.infer<typeof CohortDataSchema>;

// Internal types (not part of API schema)
interface RetentionParams {
  baseRetention: number;
  decayRate: number;
  floor: number;
  noise: number;
}

// Retention curve generator using exponential decay
function generateRetention(period: number, params: RetentionParams): number {
  if (period === 0) return 1.0;

  const { baseRetention, decayRate, floor, noise } = params;
  const base = baseRetention * Math.exp(-decayRate * (period - 1)) + floor;
  const variation = (Math.random() - 0.5) * 2 * noise;

  return Math.max(0, Math.min(1, base + variation));
}

// Generate cohort data
function generateCohortData(
  metric: string,
  periodType: string,
  cohortCount: number,
  maxPeriods: number,
): CohortData {
  const now = new Date();
  const cohorts: CohortRow[] = [];
  const periods: string[] = [];
  const periodLabels: string[] = [];

  // Generate period headers
  for (let i = 0; i < maxPeriods; i++) {
    periods.push(`M${i}`);
    periodLabels.push(i === 0 ? "Month 0" : `Month ${i}`);
  }

  // Retention parameters vary by metric type
  const paramsMap: Record<string, RetentionParams> = {
    retention: {
      baseRetention: 0.75,
      decayRate: 0.12,
      floor: 0.08,
      noise: 0.04,
    },
    revenue: { baseRetention: 0.7, decayRate: 0.1, floor: 0.15, noise: 0.06 },
    active: { baseRetention: 0.6, decayRate: 0.18, floor: 0.05, noise: 0.05 },
  };
  const params = paramsMap[metric] ?? paramsMap.retention;

  // Generate cohorts (oldest first)
  for (let c = 0; c < cohortCount; c++) {
    const cohortDate = new Date(now);
    cohortDate.setMonth(cohortDate.getMonth() - (cohortCount - 1 - c));

    const cohortId = `${cohortDate.getFullYear()}-${String(cohortDate.getMonth() + 1).padStart(2, "0")}`;
    const cohortLabel = cohortDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    // Random cohort size: 1000-5000 users
    const originalUsers = Math.floor(1000 + Math.random() * 4000);

    // Number of periods this cohort has data for (newer cohorts have fewer periods)
    const periodsAvailable = cohortCount - c;

    const cells: CohortCell[] = [];
    let previousRetention = 1.0;

    for (let p = 0; p < Math.min(periodsAvailable, maxPeriods); p++) {
      // Retention must decrease or stay same (with small exceptions for noise)
      let retention = generateRetention(p, params);
      retention = Math.min(retention, previousRetention + 0.02);
      previousRetention = retention;

      cells.push({
        cohortIndex: c,
        periodIndex: p,
        retention,
        usersRetained: Math.round(originalUsers * retention),
        usersOriginal: originalUsers,
      });
    }

    cohorts.push({ cohortId, cohortLabel, originalUsers, cells });
  }

  return {
    cohorts,
    periods,
    periodLabels,
    metric,
    periodType,
    generatedAt: new Date().toISOString(),
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Cohort Heatmap Server",
    version: "1.0.0",
  });

  // Register tool and resource
  const resourceUri = "ui://get-cohort-data/mcp-app.html";

  registerAppTool(
    server,
    "get-cohort-data",
    {
      title: "Get Cohort Retention Data",
      description:
        "Returns cohort retention heatmap data showing customer retention over time by signup month",
      inputSchema: GetCohortDataInputSchema.shape,
      _meta: { [RESOURCE_URI_META_KEY]: resourceUri },
    },
    async ({ metric, periodType, cohortCount, maxPeriods }) => {
      const data = generateCohortData(
        metric,
        periodType,
        cohortCount,
        maxPeriods,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
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

  return server;
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await createServer().connect(new StdioServerTransport());
  } else {
    const port = parseInt(process.env.PORT ?? "3104", 10);
    await startServer(createServer, { port, name: "Cohort Heatmap Server" });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
