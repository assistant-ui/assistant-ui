import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import si from "systeminformation";
import { z } from "zod";
import {
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { startServer } from "./server-utils.js";

// Schemas - types are derived from these using z.infer
const CpuCoreSchema = z.object({
  idle: z.number(),
  total: z.number(),
});

const CpuStatsSchema = z.object({
  cores: z.array(CpuCoreSchema),
  model: z.string(),
  count: z.number(),
});

const MemoryStatsSchema = z.object({
  usedBytes: z.number(),
  totalBytes: z.number(),
  usedPercent: z.number(),
  freeBytes: z.number(),
  usedFormatted: z.string(),
  totalFormatted: z.string(),
});

const SystemInfoSchema = z.object({
  hostname: z.string(),
  platform: z.string(),
  arch: z.string(),
  uptime: z.number(),
  uptimeFormatted: z.string(),
});

const SystemStatsSchema = z.object({
  cpu: CpuStatsSchema,
  memory: MemoryStatsSchema,
  system: SystemInfoSchema,
  timestamp: z.string(),
});

// Types derived from schemas
type CpuCore = z.infer<typeof CpuCoreSchema>;
type MemoryStats = z.infer<typeof MemoryStatsSchema>;
type SystemStats = z.infer<typeof SystemStatsSchema>;
const DIST_DIR = path.join(import.meta.dirname, "dist");

// Returns raw CPU timing data per core (client calculates usage from deltas)
function getCpuSnapshots(): CpuCore[] {
  return os.cpus().map((cpu) => {
    const times = cpu.times;
    const idle = times.idle;
    const total = times.user + times.nice + times.sys + times.idle + times.irq;
    return { idle, total };
  });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(" ") : "< 1m";
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

async function getMemoryStats(): Promise<MemoryStats> {
  const mem = await si.mem();
  return {
    usedBytes: mem.active,
    totalBytes: mem.total,
    usedPercent: Math.round((mem.active / mem.total) * 100),
    freeBytes: mem.available,
    usedFormatted: formatBytes(mem.active),
    totalFormatted: formatBytes(mem.total),
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "System Monitor Server",
    version: "1.0.0",
  });

  // Register the get-system-stats tool and its associated UI resource
  const resourceUri = "ui://system-monitor/mcp-app.html";

  registerAppTool(
    server,
    "get-system-stats",
    {
      title: "Get System Stats",
      description:
        "Returns current system statistics including per-core CPU usage, memory, and system info.",
      inputSchema: {},
      _meta: { [RESOURCE_URI_META_KEY]: resourceUri },
    },
    async (): Promise<CallToolResult> => {
      const cpuSnapshots = getCpuSnapshots();
      const cpuInfo = os.cpus()[0];
      const memory = await getMemoryStats();
      const uptimeSeconds = os.uptime();

      const stats: SystemStats = {
        cpu: {
          cores: cpuSnapshots,
          model: cpuInfo?.model ?? "Unknown",
          count: os.cpus().length,
        },
        memory,
        system: {
          hostname: os.hostname(),
          platform: `${os.platform()} ${os.arch()}`,
          arch: os.arch(),
          uptime: uptimeSeconds,
          uptimeFormatted: formatUptime(uptimeSeconds),
        },
        timestamp: new Date().toISOString(),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(stats) }],
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE, description: "System Monitor UI" },
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
    const port = parseInt(process.env.PORT ?? "3107", 10);
    await startServer(createServer, { port, name: "System Monitor Server" });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
