import {
  createWidget,
  previewWidget,
  readThemeTokens,
  type WidgetHandle,
} from "../src/index";
import { applyWidgetEdits } from "../src/tools";

const CHART_WIDGET = `<style>
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.kpi{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:12px}
.kpi span{display:block;font-size:13px;color:var(--color-text-muted)}
.kpi strong{font-size:22px;font-variant-numeric:tabular-nums}
.up{color:var(--color-success);font-size:13px}
</style>
<h2 class="sr-only">Quarterly revenue by region</h2>
<h3 style="margin:0 0 4px">Revenue by region</h3>
<p style="margin:0 0 16px;color:var(--color-text-muted);font-size:14px">FY2026, in $M</p>
<div class="kpis">
  <div class="kpi"><span>Total</span><strong>$48.2M</strong> <span class="up">▲ 12%</span></div>
  <div class="kpi"><span>Best region</span><strong>EMEA</strong></div>
  <div class="kpi"><span>Best quarter</span><strong>Q3</strong></div>
</div>
<div style="position:relative;height:260px"><canvas id="chart" role="img" aria-label="Bar chart of revenue by region per quarter"></canvas></div>
<p style="margin:12px 0 0"><button id="ask">Ask about Q3</button></p>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const data = { labels: ["Q1", "Q2", "Q3", "Q4"], series: [["AMER", [8.1, 9.4, 11.2, 10.3]], ["EMEA", [9.0, 10.8, 13.1, 12.0]], ["APAC", [4.2, 5.1, 6.3, 5.9]]] };
const chart = new Chart(document.getElementById("chart"), {
  type: "bar",
  data: { labels: data.labels, datasets: data.series.map(([label, values]) => ({ label, data: values })) },
  options: { responsive: true, maintainAspectRatio: false, animation: { duration: 300 }, scales: { y: { beginAtZero: true } } },
});
function applyTheme() {
  Chart.defaults.color = css("--color-text-muted");
  Chart.defaults.borderColor = css("--color-border");
  Chart.defaults.font.family = css("--font-sans");
  chart.data.datasets.forEach((d, i) => { d.backgroundColor = css("--chart-" + (i + 1)); d.borderRadius = 4; });
  chart.options.scales.x.grid.color = css("--color-border");
  chart.options.scales.y.grid.color = css("--color-border");
  chart.options.scales.x.ticks.color = css("--color-text-muted");
  chart.options.scales.y.ticks.color = css("--color-text-muted");
  chart.options.plugins.legend.labels.color = css("--color-text");
  chart.update();
}
applyTheme();
window.addEventListener("themechange", applyTheme);
document.getElementById("ask").addEventListener("click", () => sendPrompt("Why did Q3 revenue peak in EMEA?"));
console.log("chart ready");
</script>`;

const DIAGRAM_WIDGET = `<svg viewBox="0 0 680 200" width="100%" role="img">
<title>Widget streaming pipeline</title>
<desc>Model output flows through the host into the frame runtime, which morphs the DOM.</desc>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--color-text-muted)"/></marker>
<style>.node{fill:var(--color-surface);stroke:var(--color-border-strong)}.focus{fill:var(--color-accent)}.label{fill:var(--color-text);font:13px var(--font-sans)}.on{fill:var(--color-accent-text)}.edge{stroke:var(--color-text-muted);stroke-width:1.5;fill:none}</style>
</defs>
<path class="edge" d="M176 100H226" marker-end="url(#arrow)"/>
<path class="edge" d="M386 100H436" marker-end="url(#arrow)"/>
<rect class="node" x="16" y="78" width="160" height="44" rx="8"/>
<text class="label" x="96" y="100" text-anchor="middle" dominant-baseline="central">Model stream</text>
<rect class="node focus" x="226" y="78" width="160" height="44" rx="8"/>
<text class="label on" x="306" y="100" text-anchor="middle" dominant-baseline="central">MessagePort</text>
<rect class="node" x="436" y="78" width="200" height="44" rx="8"/>
<text class="label" x="536" y="100" text-anchor="middle" dominant-baseline="central">Runtime morphs DOM</text>
</svg>`;

const log = (message: string) => {
  const el = document.getElementById("log")!;
  el.textContent += `${new Date().toISOString().slice(11, 23)} ${message}\n`;
  el.scrollTop = el.scrollHeight;
};

const save = async (name: string, body: string) => {
  await fetch(`/__save?name=${encodeURIComponent(name)}`, {
    method: "POST",
    body,
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type DemoState = {
  prompts: string[];
  errors: string[];
  resizes: number[];
  widget?: WidgetHandle;
  diagram?: WidgetHandle;
  steps: string[];
};

const state: DemoState = { prompts: [], errors: [], resizes: [], steps: [] };
(window as unknown as { __demo: DemoState }).__demo = state;

const mount = (container: HTMLElement) =>
  createWidget({
    container,
    product: "generative-frame-demo",
    tokens: readThemeTokens(),
    maxHeight: 900,
    onPrompt: (text) => {
      state.prompts.push(text);
      log(`sendPrompt → ${text}`);
    },
    onError: (error) => {
      state.errors.push(`${error.kind}: ${error.message}`);
      log(`error ${error.kind}: ${error.message}`);
    },
    onLog: (entry) => log(`console.${entry.level}: ${entry.message}`),
    onResize: (size) => state.resizes.push(size.height),
  });

const stream = async (
  widget: WidgetHandle,
  code: string,
  chunkSize = 48,
  delay = 25,
) => {
  for (let i = 0; i < code.length; i += chunkSize) {
    widget.write(code.slice(i, i + chunkSize));
    await sleep(delay);
  }
  return widget.end();
};

async function runChart() {
  state.widget?.dispose();
  const container = document.getElementById("widget")!;
  const widget = mount(container);
  state.widget = widget;
  const started = performance.now();
  widget.ready.then(() =>
    log(`ready in ${Math.round(performance.now() - started)}ms`),
  );
  const result = await stream(widget, CHART_WIDGET);
  log(`chart end: ${JSON.stringify(result)}`);
  state.steps.push("chart-streamed");
  return result;
}

async function runDiagram() {
  state.diagram?.dispose();
  const widget = mount(document.getElementById("diagram-widget")!);
  state.diagram = widget;
  const result = await stream(widget, DIAGRAM_WIDGET, 32, 30);
  log(`diagram end: ${JSON.stringify(result)}`);
  state.steps.push("diagram-streamed");
  return result;
}

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  const tokens = readThemeTokens();
  state.widget?.setTheme(tokens);
  state.diagram?.setTheme(tokens);
  log(`theme → ${tokens.colorScheme}`);
  state.steps.push(`theme-${tokens.colorScheme}`);
}

async function screenshot(name: string) {
  if (!state.widget) return;
  const shot = await state.widget.screenshot();
  await save(name, shot.dataUrl);
  log(`saved ${name} (${shot.width}×${shot.height})`);
  state.steps.push(`screenshot-${name}`);
}

async function editChart() {
  if (!state.widget) return;
  const edited = applyWidgetEdits(state.widget.code, [
    {
      old_string: "Revenue by region",
      new_string: "Revenue by region (edited)",
    },
  ]);
  if (!edited.ok) {
    log(`edit failed: ${edited.error}`);
    return;
  }
  const result = await state.widget.replace(edited.code);
  log(`edit applied (remount): ${JSON.stringify(result)}`);
  state.steps.push("chart-edited");
}

async function runPreview() {
  const result = await previewWidget(CHART_WIDGET, {
    product: "generative-frame-demo",
  });
  const { screenshot: png, ...rest } = result;
  log(`preview: ${JSON.stringify(rest)}`);
  if (png) await save("preview.png", png);
  state.steps.push("preview");
  return result;
}

document
  .getElementById("run")!
  .addEventListener("click", () => void runChart());
document
  .getElementById("diagram")!
  .addEventListener("click", () => void runDiagram());
document.getElementById("theme")!.addEventListener("click", toggleTheme);
document
  .getElementById("edit")!
  .addEventListener("click", () => void editChart());
document
  .getElementById("shot")!
  .addEventListener("click", () => void screenshot("manual.png"));
document
  .getElementById("preview")!
  .addEventListener("click", () => void runPreview());

async function auto() {
  try {
    await Promise.all([runChart(), runDiagram()]);
    await sleep(800);
    await screenshot("chart-light.png");
    const inspection = await state.widget!.inspect();
    await save(
      "inspect-light.json",
      JSON.stringify({ ...inspection, code: undefined }, null, 2),
    );
    toggleTheme();
    await sleep(800);
    await screenshot("chart-dark.png");
    toggleTheme();
    await sleep(300);
    await editChart();
    await sleep(800);
    await screenshot("chart-edited.png");
    const preview = await runPreview();
    const { screenshot: _png, ...previewReport } = preview;
    await save(
      "report.json",
      JSON.stringify(
        {
          steps: state.steps,
          prompts: state.prompts,
          errors: state.errors,
          resizes: state.resizes,
          preview: previewReport,
        },
        null,
        2,
      ),
    );
    log("auto run complete");
    state.steps.push("done");
  } catch (error) {
    log(
      `auto run failed: ${error instanceof Error ? error.stack : String(error)}`,
    );
    state.steps.push("failed");
  }
}

if (new URLSearchParams(location.search).has("auto")) void auto();
