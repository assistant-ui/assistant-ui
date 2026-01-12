/**
 * @file Customer Segmentation Explorer - interactive scatter/bubble visualization
 */
import {
  App,
  applyHostStyleVariables,
  applyHostFonts,
  applyDocumentTheme,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { Chart, registerables } from "chart.js";
import "./global.css";
import "./mcp-app.css";
import type { Customer, SegmentSummary, MetricName } from "./types.ts";
import { SEGMENT_COLORS, METRIC_LABELS } from "./types.ts";

// Register Chart.js components
Chart.register(...registerables);

const log = {
  info: console.log.bind(console, "[APP]"),
  error: console.error.bind(console, "[APP]"),
};

// DOM element references
const mainEl = document.querySelector(".main") as HTMLElement;
const xAxisSelect = document.getElementById("x-axis") as HTMLSelectElement;
const yAxisSelect = document.getElementById("y-axis") as HTMLSelectElement;
const sizeMetricSelect = document.getElementById(
  "size-metric",
) as HTMLSelectElement;
const chartCanvas = document.getElementById(
  "scatter-chart",
) as HTMLCanvasElement;
const legendContainer = document.getElementById("legend")!;
const detailPanel = document.getElementById("detail-panel")!;

// App state
interface AppState {
  customers: Customer[];
  segments: SegmentSummary[];
  chart: Chart | null;
  xAxis: MetricName;
  yAxis: MetricName;
  sizeMetric: string;
  hiddenSegments: Set<string>;
  selectedCustomer: Customer | null;
}

const state: AppState = {
  customers: [],
  segments: [],
  chart: null,
  xAxis: "annualRevenue",
  yAxis: "engagementScore",
  sizeMetric: "off",
  hiddenSegments: new Set(),
  selectedCustomer: null,
};

// Format numbers for display
function formatValue(value: number, metric: MetricName): string {
  switch (metric) {
    case "annualRevenue":
      if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
      }
      return `$${(value / 1_000).toFixed(0)}K`;
    case "employeeCount":
      return value.toLocaleString();
    case "accountAge":
      return `${value}mo`;
    case "engagementScore":
      return `${value}`;
    case "supportTickets":
      return `${value}`;
    case "nps":
      return value >= 0 ? `+${value}` : `${value}`;
    default:
      return `${value}`;
  }
}

// Get min/max for a metric across all customers
function getMetricRange(
  customers: Customer[],
  metric: MetricName,
): { min: number; max: number } {
  const values = customers.map((c) => c[metric] as number);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

// Normalize value to bubble radius (6-30px range)
function normalizeToRadius(value: number, min: number, max: number): number {
  if (max === min) return 12;
  const normalized = (value - min) / (max - min);
  return 6 + normalized * 24;
}

// Get filtered customers based on current state
function getFilteredCustomers(): Customer[] {
  return state.customers.filter((c) => !state.hiddenSegments.has(c.segment));
}

// Build chart datasets from customers
function buildDatasets(): Chart["data"]["datasets"] {
  const customers = getFilteredCustomers();
  const segments = [...new Set(customers.map((c) => c.segment))];

  // Calculate size range if size metric is enabled
  let sizeRange: { min: number; max: number } | null = null;
  if (state.sizeMetric !== "off") {
    sizeRange = getMetricRange(state.customers, state.sizeMetric as MetricName);
  }

  return segments.map((segment) => {
    const segmentCustomers = customers.filter((c) => c.segment === segment);
    const color = SEGMENT_COLORS[segment] || "#888888";

    return {
      label: segment,
      data: segmentCustomers.map((c) => ({
        x: c[state.xAxis] as number,
        y: c[state.yAxis] as number,
        r:
          sizeRange && state.sizeMetric !== "off"
            ? normalizeToRadius(
                c[state.sizeMetric as MetricName] as number,
                sizeRange.min,
                sizeRange.max,
              )
            : 8,
        customer: c,
      })),
      backgroundColor: color + "aa",
      borderColor: color,
      borderWidth: 1,
      hoverBackgroundColor: color,
      hoverBorderColor: "#ffffff",
      hoverBorderWidth: 2,
    };
  });
}

// Hidden element for resolving CSS color values (reused to avoid DOM thrashing)
let colorResolver: HTMLDivElement | null = null;

// Resolve a CSS color value (handles light-dark() function)
function resolveColor(cssValue: string, fallback: string): string {
  if (!cssValue) return fallback;
  // If it's a simple color value, return it directly
  if (!cssValue.includes("light-dark(")) return cssValue;
  // Create resolver element once and keep it hidden
  if (!colorResolver) {
    colorResolver = document.createElement("div");
    colorResolver.style.position = "absolute";
    colorResolver.style.visibility = "hidden";
    colorResolver.style.pointerEvents = "none";
    document.body.appendChild(colorResolver);
  }
  colorResolver.style.color = cssValue;
  return getComputedStyle(colorResolver).color || fallback;
}

// Get colors from CSS variables
function getChartColors(): { textColor: string; gridColor: string } {
  const style = getComputedStyle(document.documentElement);
  const rawTextColor = style.getPropertyValue("--color-text-secondary").trim();
  const rawGridColor = style.getPropertyValue("--color-border-primary").trim();
  return {
    textColor: resolveColor(rawTextColor, "#6b7280"),
    gridColor: resolveColor(rawGridColor, "#e5e7eb"),
  };
}

// Initialize Chart.js
function initChart(): Chart {
  const { textColor, gridColor } = getChartColors();

  return new Chart(chartCanvas, {
    type: "bubble",
    data: {
      datasets: buildDatasets(),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300,
      },
      interaction: {
        intersect: true,
        mode: "nearest",
      },
      plugins: {
        legend: {
          display: false, // Using custom legend
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => {
              const point = context.raw as { customer: Customer };
              const c = point.customer;
              return [
                c.name,
                `${METRIC_LABELS[state.xAxis]}: ${formatValue(c[state.xAxis] as number, state.xAxis)}`,
                `${METRIC_LABELS[state.yAxis]}: ${formatValue(c[state.yAxis] as number, state.yAxis)}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: METRIC_LABELS[state.xAxis],
            color: textColor,
            font: { size: 11, weight: "bold" },
          },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (value) => formatValue(value as number, state.xAxis),
          },
          grid: {
            color: gridColor,
          },
        },
        y: {
          title: {
            display: true,
            text: METRIC_LABELS[state.yAxis],
            color: textColor,
            font: { size: 11, weight: "bold" },
          },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (value) => formatValue(value as number, state.yAxis),
          },
          grid: {
            color: gridColor,
          },
        },
      },
      onClick: (_event, elements) => {
        if (elements.length > 0) {
          const element = elements[0];
          const dataset = state.chart!.data.datasets[element.datasetIndex];
          const point = dataset.data[element.index] as unknown as {
            customer: Customer;
          };
          state.selectedCustomer = point.customer;
          updateDetailPanel(point.customer);
        }
      },
      onHover: (_event, elements) => {
        if (elements.length > 0 && !state.selectedCustomer) {
          const element = elements[0];
          const dataset = state.chart!.data.datasets[element.datasetIndex];
          const point = dataset.data[element.index] as unknown as {
            customer: Customer;
          };
          updateDetailPanel(point.customer);
        } else if (elements.length === 0 && !state.selectedCustomer) {
          resetDetailPanel();
        }
      },
    },
  });
}

// Update chart with new data
function updateChart(): void {
  if (!state.chart) return;

  const { textColor, gridColor } = getChartColors();

  state.chart.data.datasets = buildDatasets();

  // Update axis titles and formatters (using type assertions for Chart.js scale options)
  const scales = state.chart.options.scales as {
    x: {
      title: { text: string; color: string };
      ticks: { color: string; callback: (value: number) => string };
      grid: { color: string };
    };
    y: {
      title: { text: string; color: string };
      ticks: { color: string; callback: (value: number) => string };
      grid: { color: string };
    };
  };

  scales.x.title.text = METRIC_LABELS[state.xAxis];
  scales.y.title.text = METRIC_LABELS[state.yAxis];
  scales.x.title.color = textColor;
  scales.y.title.color = textColor;
  scales.x.ticks.color = textColor;
  scales.y.ticks.color = textColor;
  scales.x.ticks.callback = (value: number) => formatValue(value, state.xAxis);
  scales.y.ticks.callback = (value: number) => formatValue(value, state.yAxis);
  scales.x.grid.color = gridColor;
  scales.y.grid.color = gridColor;

  state.chart.update();
}

// Render custom legend
function renderLegend(): void {
  // Count customers per segment
  const counts = new Map<string, number>();
  for (const c of state.customers) {
    counts.set(c.segment, (counts.get(c.segment) || 0) + 1);
  }

  legendContainer.innerHTML = state.segments
    .map((seg) => {
      const count = counts.get(seg.name) || 0;
      const isHidden = state.hiddenSegments.has(seg.name);
      return `
        <div class="legend-item ${isHidden ? "hidden" : ""}" data-segment="${seg.name}">
          <span class="legend-dot" style="background: ${seg.color}"></span>
          <span class="legend-label">${seg.name}</span>
          <span class="legend-count">(${count})</span>
        </div>
      `;
    })
    .join("");

  // Add click handlers
  legendContainer.querySelectorAll(".legend-item").forEach((item) => {
    item.addEventListener("click", () => {
      const segment = item.getAttribute("data-segment")!;
      if (state.hiddenSegments.has(segment)) {
        state.hiddenSegments.delete(segment);
      } else {
        state.hiddenSegments.add(segment);
      }
      renderLegend();
      updateChart();
    });
  });
}

// Update detail panel with customer info
function updateDetailPanel(customer: Customer): void {
  const segmentClass = customer.segment.toLowerCase().replace("-", "-");
  detailPanel.innerHTML = `
    <span class="detail-name">${customer.name}</span>
    <span class="detail-segment ${segmentClass}">${customer.segment}</span>
    <span class="detail-metric"><strong>${formatValue(customer.annualRevenue, "annualRevenue")}</strong> rev</span>
    <span class="detail-metric"><strong>${customer.engagementScore}</strong> engagement</span>
    <span class="detail-metric"><strong>${customer.nps >= 0 ? "+" : ""}${customer.nps}</strong> NPS</span>
  `;
}

// Reset detail panel to placeholder
function resetDetailPanel(): void {
  detailPanel.innerHTML =
    '<span class="detail-placeholder">Hover over a point to see details</span>';
}

// Create app instance
const app = new App({ name: "Customer Segmentation", version: "1.0.0" });

// Fetch data from server
async function fetchData(): Promise<void> {
  try {
    const result = await app.callServerTool({
      name: "get-customer-data",
      arguments: {},
    });

    const text = result
      .content!.filter(
        (c): c is { type: "text"; text: string } => c.type === "text",
      )
      .map((c) => c.text)
      .join("");
    const data = JSON.parse(text) as {
      customers: Customer[];
      segments: SegmentSummary[];
    };

    state.customers = data.customers;
    state.segments = data.segments;

    // Initialize or update chart
    if (!state.chart) {
      state.chart = initChart();
    } else {
      updateChart();
    }

    renderLegend();
    log.info(`Loaded ${data.customers.length} customers`);
  } catch (error) {
    log.error("Failed to fetch data:", error);
  }
}

// Event handlers
xAxisSelect.addEventListener("change", () => {
  state.xAxis = xAxisSelect.value as MetricName;
  updateChart();
});

yAxisSelect.addEventListener("change", () => {
  state.yAxis = yAxisSelect.value as MetricName;
  updateChart();
});

sizeMetricSelect.addEventListener("change", () => {
  state.sizeMetric = sizeMetricSelect.value;
  updateChart();
});

// Clear selection when clicking outside chart
document.addEventListener("click", (e) => {
  if (!(e.target as HTMLElement).closest(".chart-section")) {
    state.selectedCustomer = null;
    resetDetailPanel();
  }
});

// Handle system theme changes (fallback when host doesn't provide styles)
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    // Only apply if we haven't received host theme
    if (!app.getHostContext()?.theme) {
      applyDocumentTheme(e.matches ? "dark" : "light");
      if (state.chart) {
        state.chart.destroy();
        state.chart = initChart();
      }
    }
  });

// Apply initial theme based on system preference (before host context is available)
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyDocumentTheme(systemDark ? "dark" : "light");

// Register handlers and connect
app.onerror = log.error;

// Handle host context changes (theme, styles, and fonts from host)
function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
  // Recreate chart to pick up new colors
  if (state.chart && (ctx.theme || ctx.styles?.variables)) {
    state.chart.destroy();
    state.chart = initChart();
  }
}

app.onhostcontextchanged = handleHostContextChanged;

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) {
    handleHostContextChanged(ctx);
  }
});

// Fetch data after connection
setTimeout(fetchData, 100);
