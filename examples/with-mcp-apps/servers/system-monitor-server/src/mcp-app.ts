/**
 * @file System Monitor App - displays real-time OS metrics with Chart.js
 */
import { App, type McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { Chart, registerables } from "chart.js";
import "./global.css";
import "./mcp-app.css";

// Register Chart.js components
Chart.register(...registerables);

const log = {
  info: console.log.bind(console, "[APP]"),
  error: console.error.bind(console, "[APP]"),
};

// Types for system stats response
interface SystemStats {
  cpu: {
    cores: Array<{ idle: number; total: number }>;
    model: string;
    count: number;
  };
  memory: {
    usedBytes: number;
    totalBytes: number;
    usedPercent: number;
    freeBytes: number;
    usedFormatted: string;
    totalFormatted: string;
  };
  system: {
    hostname: string;
    platform: string;
    arch: string;
    uptime: number;
    uptimeFormatted: string;
  };
  timestamp: string;
}

// DOM element references
const mainEl = document.querySelector(".main") as HTMLElement;
const pollToggleBtn = document.getElementById("poll-toggle-btn")!;
const statusIndicator = document.getElementById("status-indicator")!;
const statusText = document.getElementById("status-text")!;
const cpuChartCanvas = document.getElementById(
  "cpu-chart",
) as HTMLCanvasElement;
const memoryBarFill = document.getElementById("memory-bar-fill")!;
const memoryPercent = document.getElementById("memory-percent")!;
const memoryDetail = document.getElementById("memory-detail")!;
const infoHostname = document.getElementById("info-hostname")!;
const infoPlatform = document.getElementById("info-platform")!;
const infoUptime = document.getElementById("info-uptime")!;

// Polling state
const HISTORY_LENGTH = 30;
const POLL_INTERVAL = 2000;

interface PollingState {
  isPolling: boolean;
  intervalId: number | null;
  cpuHistory: number[][]; // [timestamp][coreIndex] = usage%
  labels: string[];
  coreCount: number;
  chart: Chart | null;
  previousCpuSnapshots: Array<{ idle: number; total: number }> | null;
}

const state: PollingState = {
  isPolling: false,
  intervalId: null,
  cpuHistory: [],
  labels: [],
  coreCount: 0,
  chart: null,
  previousCpuSnapshots: null,
};

// Color palette for CPU cores (distinct colors)
const CORE_COLORS = [
  "rgba(59, 130, 246, 0.7)", // blue
  "rgba(16, 185, 129, 0.7)", // green
  "rgba(245, 158, 11, 0.7)", // amber
  "rgba(239, 68, 68, 0.7)", // red
  "rgba(139, 92, 246, 0.7)", // purple
  "rgba(236, 72, 153, 0.7)", // pink
  "rgba(20, 184, 166, 0.7)", // teal
  "rgba(249, 115, 22, 0.7)", // orange
  "rgba(34, 197, 94, 0.7)", // emerald
  "rgba(168, 85, 247, 0.7)", // violet
  "rgba(251, 146, 60, 0.7)", // orange-light
  "rgba(74, 222, 128, 0.7)", // green-light
  "rgba(96, 165, 250, 0.7)", // blue-light
  "rgba(248, 113, 113, 0.7)", // red-light
  "rgba(167, 139, 250, 0.7)", // purple-light
  "rgba(244, 114, 182, 0.7)", // pink-light
];

// Calculate CPU usage percentages from raw timing data
function calculateCpuUsage(
  current: Array<{ idle: number; total: number }>,
  previous: Array<{ idle: number; total: number }> | null,
): number[] {
  if (!previous || previous.length !== current.length) {
    return current.map(() => 0);
  }
  return current.map((cur, i) => {
    const prev = previous[i];
    const idleDiff = cur.idle - prev.idle;
    const totalDiff = cur.total - prev.total;
    if (totalDiff === 0) return 0;
    return Math.round((1 - idleDiff / totalDiff) * 100);
  });
}

function initChart(coreCount: number): Chart {
  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const textColor = isDarkMode ? "#9ca3af" : "#6b7280";
  const gridColor = isDarkMode ? "#374151" : "#e5e7eb";

  const datasets = Array.from({ length: coreCount }, (_, i) => ({
    label: `P${i}`,
    data: [] as number[],
    fill: true,
    backgroundColor: CORE_COLORS[i % CORE_COLORS.length],
    borderColor: CORE_COLORS[i % CORE_COLORS.length].replace("0.7", "1"),
    borderWidth: 1,
    pointRadius: 0,
    tension: 0.3,
  }));

  return new Chart(cpuChartCanvas, {
    type: "line",
    data: {
      labels: [],
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300,
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            boxWidth: 12,
            padding: 8,
            font: { size: 10 },
            color: textColor,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${context.parsed.y}%`,
          },
        },
      },
      scales: {
        x: {
          display: false,
        },
        y: {
          stacked: true,
          min: 0,
          max: coreCount * 100,
          ticks: {
            callback: (value) => `${value}%`,
            color: textColor,
            font: { size: 10 },
          },
          grid: {
            color: gridColor,
          },
        },
      },
    },
  });
}

function updateChart(cpuHistory: number[][], labels: string[]): void {
  if (!state.chart) return;

  state.chart.data.labels = labels;

  // Transpose: cpuHistory[time][core] -> datasets[core].data[time]
  for (let coreIdx = 0; coreIdx < state.coreCount; coreIdx++) {
    state.chart.data.datasets[coreIdx].data = cpuHistory.map(
      (snapshot) => snapshot[coreIdx] ?? 0,
    );
  }

  // Dynamic y-axis scaling
  // Calculate max stacked value (sum of all cores at each time point)
  const stackedTotals = cpuHistory.map((snapshot) =>
    snapshot.reduce((sum, val) => sum + val, 0),
  );
  const currentMax = Math.max(...stackedTotals, 0);

  // Add 20% headroom, clamp to reasonable bounds
  const headroom = 1.2;
  const minVisible = state.coreCount * 15; // At least 15% per core visible
  const absoluteMax = state.coreCount * 100;

  const dynamicMax = Math.min(
    Math.max(currentMax * headroom, minVisible),
    absoluteMax,
  );

  state.chart.options.scales!.y!.max = dynamicMax;

  state.chart.update("none");
}

function updateMemoryBar(memory: SystemStats["memory"]): void {
  const percent = memory.usedPercent;

  memoryBarFill.style.width = `${percent}%`;
  memoryBarFill.classList.remove("warning", "danger");

  if (percent >= 80) {
    memoryBarFill.classList.add("danger");
  } else if (percent >= 60) {
    memoryBarFill.classList.add("warning");
  }

  memoryPercent.textContent = `${percent}%`;
  memoryDetail.textContent = `${memory.usedFormatted} / ${memory.totalFormatted}`;
}

function updateSystemInfo(system: SystemStats["system"]): void {
  infoHostname.textContent = system.hostname;
  infoPlatform.textContent = system.platform;
  infoUptime.textContent = system.uptimeFormatted;
}

function updateStatus(text: string, isPolling = false, isError = false): void {
  statusText.textContent = text;
  statusIndicator.classList.remove("polling", "error");

  if (isError) {
    statusIndicator.classList.add("error");
  } else if (isPolling) {
    statusIndicator.classList.add("polling");
  }
}

// Create app instance
const app = new App({ name: "System Monitor", version: "1.0.0" });

async function fetchStats(): Promise<void> {
  try {
    const result = await app.callServerTool({
      name: "refresh-stats", // Use app-only tool for polling
      arguments: {},
    });

    const text = result
      .content!.filter(
        (c): c is { type: "text"; text: string } => c.type === "text",
      )
      .map((c) => c.text)
      .join("");
    const stats = JSON.parse(text) as SystemStats;

    // Initialize chart on first data if needed
    if (!state.chart && stats.cpu.count > 0) {
      state.coreCount = stats.cpu.count;
      state.chart = initChart(state.coreCount);
    }

    // Calculate CPU usage from raw timing data (client-side)
    const coreUsages = calculateCpuUsage(
      stats.cpu.cores,
      state.previousCpuSnapshots,
    );
    state.previousCpuSnapshots = stats.cpu.cores;
    state.cpuHistory.push(coreUsages);
    state.labels.push(new Date().toLocaleTimeString());

    // Trim to window size
    if (state.cpuHistory.length > HISTORY_LENGTH) {
      state.cpuHistory.shift();
      state.labels.shift();
    }

    // Update UI
    updateChart(state.cpuHistory, state.labels);
    updateMemoryBar(stats.memory);
    updateSystemInfo(stats.system);

    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    updateStatus(time, true);
  } catch (error) {
    log.error("Failed to fetch stats:", error);
    updateStatus("Error", false, true);
  }
}

function startPolling(): void {
  if (state.isPolling) return;

  state.isPolling = true;
  pollToggleBtn.textContent = "Stop";
  pollToggleBtn.classList.add("active");
  updateStatus("Starting...", true);

  // Immediate first fetch
  fetchStats();

  // Start interval
  state.intervalId = window.setInterval(fetchStats, POLL_INTERVAL);
}

function stopPolling(): void {
  if (!state.isPolling) return;

  state.isPolling = false;
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }

  pollToggleBtn.textContent = "Start";
  pollToggleBtn.classList.remove("active");
  updateStatus("Stopped");
}

function togglePolling(): void {
  if (state.isPolling) {
    stopPolling();
  } else {
    startPolling();
  }
}

// Event listeners
pollToggleBtn.addEventListener("click", togglePolling);

// Handle theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (state.chart) {
      state.chart.destroy();
      state.chart = initChart(state.coreCount);
      updateChart(state.cpuHistory, state.labels);
    }
  });

// Register handlers and connect
app.onerror = log.error;

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

app.onhostcontextchanged = handleHostContextChanged;

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) {
    handleHostContextChanged(ctx);
  }
});

// Auto-start polling after a short delay
setTimeout(startPolling, 500);
