/**
 * Budget Allocator App - Interactive budget allocation with real-time visualization
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  defaultPercent: number;
}

interface BenchmarkPercentiles {
  p25: number;
  p50: number;
  p75: number;
}

interface StageBenchmark {
  stage: string;
  categoryBenchmarks: Record<string, BenchmarkPercentiles>;
}

interface BudgetConfig {
  categories: BudgetCategory[];
  presetBudgets: number[];
  defaultBudget: number;
  currency: string;
  currencySymbol: string;
}

interface HistoricalMonth {
  month: string;
  allocations: Record<string, number>;
}

interface BudgetAnalytics {
  history: HistoricalMonth[];
  benchmarks: StageBenchmark[];
  stages: string[];
  defaultStage: string;
}

interface BudgetDataResponse {
  config: BudgetConfig;
  analytics: BudgetAnalytics;
}

interface AppState {
  config: BudgetConfig | null;
  analytics: BudgetAnalytics | null;
  totalBudget: number;
  allocations: Map<string, number>;
  selectedStage: string;
  chart: Chart<"doughnut"> | null;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state: AppState = {
  config: null,
  analytics: null,
  totalBudget: 100000,
  allocations: new Map(),
  selectedStage: "Series A",
  chart: null,
};

// ---------------------------------------------------------------------------
// DOM References
// ---------------------------------------------------------------------------

const appContainer = document.querySelector(".app-container") as HTMLElement;
const budgetSelector = document.getElementById(
  "budget-selector",
) as HTMLSelectElement;
const stageSelector = document.getElementById(
  "stage-selector",
) as HTMLSelectElement;
const slidersContainer = document.getElementById("sliders-container")!;
const statusBar = document.getElementById("status-bar")!;
const comparisonSummary = document.getElementById("comparison-summary")!;
const chartCanvas = document.getElementById(
  "budget-chart",
) as HTMLCanvasElement;

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const symbol = state.config?.currencySymbol ?? "$";
  if (amount >= 1000) {
    return `${symbol}${Math.round(amount / 1000)}K`;
  }
  return `${symbol}${amount.toLocaleString()}`;
}

function formatCurrencyFull(amount: number): string {
  const symbol = state.config?.currencySymbol ?? "$";
  return `${symbol}${amount.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Sparkline Rendering (Custom Canvas)
// ---------------------------------------------------------------------------

function drawSparkline(
  canvas: HTMLCanvasElement,
  data: number[],
  color: string,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx || data.length < 2) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 2;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Calculate min/max for scaling
  const min = Math.min(...data) - 2;
  const max = Math.max(...data) + 2;
  const range = max - min || 1;

  // Draw area fill
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);

  data.forEach((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y =
      height - padding - ((value - min) / range) * (height - 2 * padding);
    ctx.lineTo(x, y);
  });

  ctx.lineTo(width - padding, height - padding);
  ctx.closePath();
  ctx.fillStyle = `${color}20`; // 12.5% opacity
  ctx.fill();

  // Draw line
  ctx.beginPath();
  data.forEach((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y =
      height - padding - ((value - min) / range) * (height - 2 * padding);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Percentile Calculation
// ---------------------------------------------------------------------------

function calculatePercentile(
  value: number,
  benchmarks: BenchmarkPercentiles,
): number {
  // Interpolate percentile based on value position relative to p25, p50, p75
  if (value <= benchmarks.p25) {
    return 25 * (value / benchmarks.p25);
  }
  if (value <= benchmarks.p50) {
    return (
      25 + 25 * ((value - benchmarks.p25) / (benchmarks.p50 - benchmarks.p25))
    );
  }
  if (value <= benchmarks.p75) {
    return (
      50 + 25 * ((value - benchmarks.p50) / (benchmarks.p75 - benchmarks.p50))
    );
  }
  // Above p75
  const extraRange = benchmarks.p75 - benchmarks.p50;
  return 75 + 25 * Math.min(1, (value - benchmarks.p75) / extraRange);
}

function getPercentileClass(percentile: number): string {
  if (percentile >= 40 && percentile <= 60) return "percentile-normal";
  if (percentile > 60) return "percentile-high";
  return "percentile-low";
}

function formatPercentileBadge(percentile: number): string {
  const rounded = Math.round(percentile);
  if (percentile >= 40 && percentile <= 60) return `${rounded}th`;
  if (percentile > 60) return `${rounded}th`;
  return `${rounded}th`;
}

function getPercentileIcon(percentile: number): string {
  if (percentile >= 40 && percentile <= 60) return "";
  if (percentile > 60) return "";
  return "";
}

// ---------------------------------------------------------------------------
// Chart Initialization
// ---------------------------------------------------------------------------

function initChart(categories: BudgetCategory[]): Chart<"doughnut"> {
  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

  return new Chart(chartCanvas, {
    type: "doughnut",
    data: {
      labels: categories.map((c) => c.name),
      datasets: [
        {
          data: categories.map(
            (c) => state.allocations.get(c.id) ?? c.defaultPercent,
          ),
          backgroundColor: categories.map((c) => c.color),
          borderWidth: 2,
          borderColor: isDarkMode ? "#1f2937" : "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "60%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = ctx.parsed;
              const amt = (pct / 100) * state.totalBudget;
              return `${ctx.label}: ${pct.toFixed(1)}% (${formatCurrency(amt)})`;
            },
          },
        },
      },
      onClick: (_event, elements) => {
        if (elements.length > 0 && state.config) {
          const index = elements[0].index;
          focusSlider(state.config.categories[index].id);
        }
      },
      onHover: (_event, elements) => {
        if (elements.length > 0 && state.config) {
          highlightSlider(state.config.categories[elements[0].index].id);
        } else {
          clearSliderHighlight();
        }
      },
    },
  });
}

function updateChart(): void {
  if (!state.chart || !state.config) return;

  const data = state.config.categories.map(
    (c) => state.allocations.get(c.id) ?? 0,
  );
  state.chart.data.datasets[0].data = data;
  state.chart.update("none");
}

// ---------------------------------------------------------------------------
// Slider Management
// ---------------------------------------------------------------------------

function createSliderRow(
  category: BudgetCategory,
  historyData: number[],
): HTMLElement {
  const allocation =
    state.allocations.get(category.id) ?? category.defaultPercent;
  const amount = (allocation / 100) * state.totalBudget;

  // Calculate trend info for tooltip
  const firstVal = historyData[0] ?? 0;
  const lastVal = historyData[historyData.length - 1] ?? 0;
  const trendDiff = lastVal - firstVal;
  const trendArrow =
    Math.abs(trendDiff) < 0.5 ? "" : trendDiff > 0 ? " +" : " ";
  const tooltipText = `Past allocations: ${firstVal.toFixed(0)}%${trendArrow}${trendDiff.toFixed(1)}%`;

  const row = document.createElement("div");
  row.className = "slider-row";
  row.dataset.categoryId = category.id;

  row.innerHTML = `
    <label class="slider-label" style="--category-color: ${category.color}">
      <span class="color-dot"></span>
      <span class="label-text">${category.name}</span>
    </label>
    <div class="sparkline-wrapper">
      <canvas class="sparkline" width="50" height="28"></canvas>
      <span class="sparkline-tooltip">${tooltipText}</span>
    </div>
    <div class="slider-container">
      <input
        type="range"
        class="slider"
        min="0"
        max="100"
        step="1"
        value="${allocation}"
      />
    </div>
    <span class="slider-value">
      <span class="percent">${allocation.toFixed(1)}%</span>
      <span class="amount">${formatCurrency(amount)}</span>
    </span>
    <span class="percentile-badge"></span>
  `;

  // Draw sparkline
  const sparklineCanvas = row.querySelector(".sparkline") as HTMLCanvasElement;
  drawSparkline(sparklineCanvas, historyData, category.color);

  // Slider event listener
  const slider = row.querySelector(".slider") as HTMLInputElement;
  slider.addEventListener("input", () => {
    handleSliderChange(category.id, parseFloat(slider.value));
  });

  return row;
}

function handleSliderChange(categoryId: string, newPercent: number): void {
  state.allocations.set(categoryId, newPercent);
  updateSliderDisplay(categoryId, newPercent);
  updateChart();
  updateStatusBar();
  updatePercentileBadge(categoryId);
  updateComparisonSummary();
}

function updateSliderDisplay(categoryId: string, percent: number): void {
  const row = document.querySelector(
    `.slider-row[data-category-id="${categoryId}"]`,
  );
  if (!row) return;

  const amount = (percent / 100) * state.totalBudget;
  const percentEl = row.querySelector(".percent")!;
  const amountEl = row.querySelector(".amount")!;

  percentEl.textContent = `${percent.toFixed(1)}%`;
  amountEl.textContent = formatCurrency(amount);
}

function updateAllSliderAmounts(): void {
  if (!state.config) return;

  for (const category of state.config.categories) {
    const percent = state.allocations.get(category.id) ?? 0;
    updateSliderDisplay(category.id, percent);
  }
}

function focusSlider(categoryId: string): void {
  const slider = document.querySelector(
    `.slider-row[data-category-id="${categoryId}"] .slider`,
  ) as HTMLInputElement | null;
  if (slider) {
    slider.focus();
    highlightSlider(categoryId);
  }
}

function highlightSlider(categoryId: string): void {
  clearSliderHighlight();
  const row = document.querySelector(
    `.slider-row[data-category-id="${categoryId}"]`,
  );
  if (row) {
    row.classList.add("highlighted");
  }
}

function clearSliderHighlight(): void {
  document
    .querySelectorAll(".slider-row.highlighted")
    .forEach((el) => el.classList.remove("highlighted"));
}

// ---------------------------------------------------------------------------
// Percentile Badge Updates
// ---------------------------------------------------------------------------

function updatePercentileBadge(categoryId: string): void {
  if (!state.analytics || !state.config) return;

  const stageBenchmark = state.analytics.benchmarks.find(
    (b) => b.stage === state.selectedStage,
  );
  if (!stageBenchmark) return;

  const category = state.config.categories.find((c) => c.id === categoryId);
  if (!category) return;

  const currentAllocation =
    state.allocations.get(categoryId) ?? category.defaultPercent;
  const benchmarks = stageBenchmark.categoryBenchmarks[categoryId];
  if (!benchmarks) return;

  const badge = document.querySelector(
    `.slider-row[data-category-id="${categoryId}"] .percentile-badge`,
  );
  if (!badge) return;

  const percentile = calculatePercentile(currentAllocation, benchmarks);
  badge.className = `percentile-badge ${getPercentileClass(percentile)}`;
  badge.innerHTML = `<span class="percentile-icon">${getPercentileIcon(percentile)}</span>${formatPercentileBadge(percentile)}`;
}

function updateAllPercentileBadges(): void {
  if (!state.config) return;
  for (const category of state.config.categories) {
    updatePercentileBadge(category.id);
  }
}

// ---------------------------------------------------------------------------
// Status Bar
// ---------------------------------------------------------------------------

function updateStatusBar(): void {
  const total = Array.from(state.allocations.values()).reduce(
    (sum, v) => sum + v,
    0,
  );
  const allocated = (total / 100) * state.totalBudget;
  const isBalanced = Math.abs(total - 100) < 0.1;

  let statusIcon: string;
  let statusClass: string;

  if (isBalanced) {
    statusIcon = "";
    statusClass = "status-balanced";
  } else if (total > 100) {
    statusIcon = " Over";
    statusClass = "status-warning status-over";
  } else {
    statusIcon = " Under";
    statusClass = "status-warning status-under";
  }

  statusBar.innerHTML = `
    Allocated: ${formatCurrencyFull(allocated)} / ${formatCurrencyFull(state.totalBudget)}
    <span class="status-icon">${statusIcon}</span>
  `;
  statusBar.className = `status-bar ${statusClass}`;
}

// ---------------------------------------------------------------------------
// Comparison Summary
// ---------------------------------------------------------------------------

function updateComparisonSummary(): void {
  if (!state.analytics || !state.config) return;

  const stageBenchmark = state.analytics.benchmarks.find(
    (b) => b.stage === state.selectedStage,
  );
  if (!stageBenchmark) return;

  // Find most notable deviation
  let maxDeviation = 0;
  let maxDeviationCategory: BudgetCategory | null = null;
  let maxDeviationDirection = "";

  for (const category of state.config.categories) {
    const allocation =
      state.allocations.get(category.id) ?? category.defaultPercent;
    const benchmark = stageBenchmark.categoryBenchmarks[category.id];
    if (!benchmark) continue;

    const deviation = allocation - benchmark.p50;
    if (Math.abs(deviation) > Math.abs(maxDeviation)) {
      maxDeviation = deviation;
      maxDeviationCategory = category;
      maxDeviationDirection = deviation > 0 ? "above" : "below";
    }
  }

  if (maxDeviationCategory && Math.abs(maxDeviation) > 3) {
    comparisonSummary.innerHTML = `
      vs. Industry: <span class="comparison-highlight">${maxDeviationCategory.name}</span>
      ${maxDeviation > 0 ? "" : ""} ${Math.abs(Math.round(maxDeviation))}% ${maxDeviationDirection} avg
    `;
  } else {
    comparisonSummary.textContent = "vs. Industry: similar to peers";
  }
}

// ---------------------------------------------------------------------------
// Selector Initialization
// ---------------------------------------------------------------------------

function initBudgetSelector(presets: number[], defaultBudget: number): void {
  budgetSelector.innerHTML = "";

  for (const amount of presets) {
    const option = document.createElement("option");
    option.value = amount.toString();
    option.textContent = formatCurrencyFull(amount);
    option.selected = amount === defaultBudget;
    budgetSelector.appendChild(option);
  }

  budgetSelector.addEventListener("change", () => {
    state.totalBudget = parseInt(budgetSelector.value);
    updateAllSliderAmounts();
    updateStatusBar();
  });
}

function initStageSelector(stages: string[], defaultStage: string): void {
  stageSelector.innerHTML = "";

  for (const stage of stages) {
    const option = document.createElement("option");
    option.value = stage;
    option.textContent = stage;
    option.selected = stage === defaultStage;
    stageSelector.appendChild(option);
  }

  stageSelector.addEventListener("change", () => {
    state.selectedStage = stageSelector.value;
    updateAllPercentileBadges();
    updateComparisonSummary();
  });
}

// ---------------------------------------------------------------------------
// Main Initialization
// ---------------------------------------------------------------------------

function initializeUI(config: BudgetConfig, analytics: BudgetAnalytics): void {
  state.config = config;
  state.analytics = analytics;
  state.totalBudget = config.defaultBudget;
  state.selectedStage = analytics.defaultStage;

  // Initialize allocations with defaults
  for (const category of config.categories) {
    state.allocations.set(category.id, category.defaultPercent);
  }

  // Initialize selectors
  initBudgetSelector(config.presetBudgets, config.defaultBudget);
  initStageSelector(analytics.stages, analytics.defaultStage);

  // Create slider rows
  slidersContainer.innerHTML = "";
  for (const category of config.categories) {
    const historyData = analytics.history.map(
      (h) => h.allocations[category.id] ?? 0,
    );
    const row = createSliderRow(category, historyData);
    slidersContainer.appendChild(row);
  }

  // Initialize chart
  state.chart = initChart(config.categories);

  // Update all displays
  updateAllPercentileBadges();
  updateStatusBar();
  updateComparisonSummary();

  log.info(
    "UI initialized with",
    analytics.history.length,
    "months of history",
  );
}

// ---------------------------------------------------------------------------
// App Connection
// ---------------------------------------------------------------------------

const app = new App({ name: "Budget Allocator", version: "1.0.0" });

app.ontoolresult = (result) => {
  log.info("Received tool result:", result);
  const text = result
    .content!.filter(
      (c): c is { type: "text"; text: string } => c.type === "text",
    )
    .map((c) => c.text)
    .join("");
  const data = JSON.parse(text) as BudgetDataResponse;
  if (data?.config && data?.analytics) {
    initializeUI(data.config, data.analytics);
  }
};

app.onerror = log.error;

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.safeAreaInsets) {
    appContainer.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    appContainer.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    appContainer.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    appContainer.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

app.onhostcontextchanged = handleHostContextChanged;

// Handle theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (state.chart && state.config) {
      state.chart.destroy();
      state.chart = initChart(state.config.categories);
    }
  });

// Connect to host
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) {
    handleHostContextChanged(ctx);
  }
});
