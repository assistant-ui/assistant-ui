import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useState, useMemo, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { SliderRow } from "./components/SliderRow.tsx";
import { MetricCard } from "./components/MetricCard.tsx";
import { ProjectionChart } from "./components/ProjectionChart.tsx";
import { calculateProjections, calculateSummary } from "./lib/calculations.ts";
import {
  formatCurrency,
  formatPercent,
  formatCurrencySlider,
} from "./lib/formatters.ts";
import type {
  ScenarioInputs,
  ScenarioTemplate,
  ScenarioSummary,
} from "./types.ts";
import "./global.css";
import "./mcp-app.css";

interface CallToolResultData {
  templates?: ScenarioTemplate[];
  defaultInputs?: ScenarioInputs;
}

/** Extract templates and defaultInputs from tool result content */
function extractResultData(result: CallToolResult): CallToolResultData {
  const text = result
    .content!.filter(
      (c): c is { type: "text"; text: string } => c.type === "text",
    )
    .map((c) => c.text)
    .join("");
  const { templates, defaultInputs } = JSON.parse(text) as CallToolResultData;
  return { templates, defaultInputs };
}

const APP_INFO = { name: "SaaS Scenario Modeler", version: "1.0.0" };

function getSafeAreaPaddingStyle(hostContext?: McpUiHostContext) {
  return {
    paddingTop: hostContext?.safeAreaInsets?.top,
    paddingRight: hostContext?.safeAreaInsets?.right,
    paddingBottom: hostContext?.safeAreaInsets?.bottom,
    paddingLeft: hostContext?.safeAreaInsets?.left,
  };
}

// Local defaults for immediate render (should match server's DEFAULT_INPUTS)
const FALLBACK_INPUTS: ScenarioInputs = {
  startingMRR: 50000,
  monthlyGrowthRate: 5,
  monthlyChurnRate: 3,
  grossMargin: 80,
  fixedCosts: 30000,
};

function ScenarioModeler() {
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [defaultInputs, setDefaultInputs] =
    useState<ScenarioInputs>(FALLBACK_INPUTS);
  const [hostContext, setHostContext] = useState<
    McpUiHostContext | undefined
  >();

  const { app, error } = useApp({
    appInfo: APP_INFO,
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = async (result) => {
        const { templates, defaultInputs } = extractResultData(result);
        if (templates) setTemplates(templates);
        if (defaultInputs) setDefaultInputs(defaultInputs);
      };
      app.onhostcontextchanged = (params) => {
        setHostContext((prev) => ({ ...prev, ...params }));
      };
    },
  });

  useEffect(() => {
    if (app) {
      setHostContext(app.getHostContext());
    }
  }, [app]);

  if (error) {
    return (
      <main className="main" style={getSafeAreaPaddingStyle(hostContext)}>
        <div className="loading">Error: {error.message}</div>
      </main>
    );
  }

  if (!app) {
    return (
      <main className="main" style={getSafeAreaPaddingStyle(hostContext)}>
        <div className="loading">Connecting...</div>
      </main>
    );
  }

  return (
    <ScenarioModelerInner
      templates={templates}
      defaultInputs={defaultInputs}
      hostContext={hostContext}
    />
  );
}

interface ScenarioModelerInnerProps {
  templates: ScenarioTemplate[];
  defaultInputs: ScenarioInputs;
  hostContext?: McpUiHostContext;
}

function ScenarioModelerInner({
  templates,
  defaultInputs,
  hostContext,
}: ScenarioModelerInnerProps) {
  const [inputs, setInputs] = useState<ScenarioInputs>(FALLBACK_INPUTS);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  // Derived state - recalculates when inputs change
  const projections = useMemo(() => calculateProjections(inputs), [inputs]);
  const summary = useMemo(
    () => calculateSummary(projections, inputs),
    [projections, inputs],
  );

  // Selected template (if any)
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  // Handlers
  const handleInputChange = useCallback(
    (key: keyof ScenarioInputs, value: number) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setInputs(defaultInputs);
    setSelectedTemplateId(null);
  }, [defaultInputs]);

  const handleTemplateSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedTemplateId(value || null);
    },
    [],
  );

  const handleLoadTemplate = useCallback(() => {
    if (selectedTemplate) {
      setInputs(selectedTemplate.parameters);
      setSelectedTemplateId(null);
    }
  }, [selectedTemplate]);

  return (
    <main className="main" style={getSafeAreaPaddingStyle(hostContext)}>
      {/* Header */}
      <header className="header">
        <h1 className="header-title">SaaS Scenario Modeler</h1>
        <div className="header-controls">
          <select
            className="template-select"
            value={selectedTemplateId ?? ""}
            onChange={handleTemplateSelect}
          >
            <option value="">Compare to...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <button className="reset-button" onClick={handleLoadTemplate}>
              Load
            </button>
          )}
          <button className="reset-button" onClick={handleReset}>
            Reset
          </button>
        </div>
      </header>

      {/* Parameters */}
      <section className="parameters-section">
        <h2 className="section-title">Parameters</h2>
        <SliderRow
          label="Starting MRR"
          value={inputs.startingMRR}
          min={10000}
          max={500000}
          step={5000}
          format={formatCurrencySlider}
          onChange={(v) => handleInputChange("startingMRR", v)}
        />
        <SliderRow
          label="Growth Rate"
          value={inputs.monthlyGrowthRate}
          min={0}
          max={20}
          step={0.5}
          format={(v) => formatPercent(v)}
          onChange={(v) => handleInputChange("monthlyGrowthRate", v)}
        />
        <SliderRow
          label="Churn Rate"
          value={inputs.monthlyChurnRate}
          min={0}
          max={15}
          step={0.5}
          format={(v) => formatPercent(v)}
          onChange={(v) => handleInputChange("monthlyChurnRate", v)}
        />
        <SliderRow
          label="Gross Margin"
          value={inputs.grossMargin}
          min={50}
          max={95}
          step={5}
          format={(v) => formatPercent(v)}
          onChange={(v) => handleInputChange("grossMargin", v)}
        />
        <SliderRow
          label="Fixed Costs"
          value={inputs.fixedCosts}
          min={5000}
          max={200000}
          step={5000}
          format={formatCurrencySlider}
          onChange={(v) => handleInputChange("fixedCosts", v)}
        />
      </section>

      {/* Chart */}
      <ProjectionChart
        userProjections={projections}
        templateProjections={selectedTemplate?.projections ?? null}
        templateName={selectedTemplate?.name}
      />

      {/* Metrics */}
      <MetricsSection
        userSummary={summary}
        templateSummary={selectedTemplate?.summary ?? null}
        templateName={selectedTemplate?.name}
      />
    </main>
  );
}

interface MetricsSectionProps {
  userSummary: ScenarioSummary;
  templateSummary: ScenarioSummary | null;
  templateName?: string;
}

function MetricsSection({
  userSummary,
  templateSummary,
  templateName,
}: MetricsSectionProps) {
  const profitVariant = userSummary.totalProfit >= 0 ? "positive" : "negative";

  // Calculate comparison delta
  const profitDelta = templateSummary
    ? ((userSummary.totalProfit - templateSummary.totalProfit) /
        Math.abs(templateSummary.totalProfit)) *
      100
    : null;

  return (
    <section className="metrics-section">
      <div className="metrics-comparison">
        {/* User's scenario */}
        <div className="metrics-column">
          <h3>Your Scenario</h3>
          <div className="metrics-grid">
            <MetricCard
              label="End MRR"
              value={formatCurrency(userSummary.endingMRR)}
            />
            <MetricCard
              label="Total Revenue"
              value={formatCurrency(userSummary.totalRevenue)}
            />
            <MetricCard
              label="Total Profit"
              value={formatCurrency(userSummary.totalProfit)}
              variant={profitVariant}
            />
          </div>
        </div>

        {/* Template comparison (only when selected) */}
        {templateSummary && templateName && (
          <div className="metrics-column template">
            <h3>vs. {templateName}</h3>
            <div className="metrics-grid">
              <MetricCard
                label="End MRR"
                value={formatCurrency(templateSummary.endingMRR)}
              />
              <MetricCard
                label="Total Profit"
                value={formatCurrency(templateSummary.totalProfit)}
                variant={
                  templateSummary.totalProfit >= 0 ? "positive" : "negative"
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary row */}
      <div className="metrics-summary">
        <span className="summary-item">
          Break-even:{" "}
          <span className="summary-value">
            {userSummary.breakEvenMonth
              ? `Month ${userSummary.breakEvenMonth}`
              : "Not achieved"}
          </span>
        </span>
        <span className="summary-item">
          MRR Growth:{" "}
          <span
            className={`summary-value ${userSummary.mrrGrowthPct >= 0 ? "positive" : "negative"}`}
          >
            {formatPercent(userSummary.mrrGrowthPct, true)}
          </span>
        </span>
        {profitDelta !== null && (
          <span className="summary-item">
            vs. template:{" "}
            <span
              className={`summary-value ${profitDelta >= 0 ? "positive" : "negative"}`}
            >
              {formatPercent(profitDelta, true)}
            </span>
          </span>
        )}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ScenarioModeler />
  </StrictMode>,
);
