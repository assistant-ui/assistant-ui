/**
 * Cohort Retention Heatmap - MCP App
 *
 * Interactive cohort retention analysis heatmap showing customer retention
 * over time by signup month. Hover for details, click to drill down.
 */
import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import styles from "./mcp-app.module.css";

// Types
interface CohortCell {
  cohortIndex: number;
  periodIndex: number;
  retention: number;
  usersRetained: number;
  usersOriginal: number;
}

interface CohortRow {
  cohortId: string;
  cohortLabel: string;
  originalUsers: number;
  cells: CohortCell[];
}

interface CohortData {
  cohorts: CohortRow[];
  periods: string[];
  periodLabels: string[];
  metric: string;
  periodType: string;
  generatedAt: string;
}

interface TooltipData {
  x: number;
  y: number;
  cohortLabel: string;
  periodLabel: string;
  retention: number;
  usersRetained: number;
  usersOriginal: number;
}

type MetricType = "retention" | "revenue" | "active";
type PeriodType = "monthly" | "weekly";

const IMPLEMENTATION = { name: "Cohort Heatmap", version: "1.0.0" };

// Color scale function: Green (high) -> Yellow (medium) -> Red (low)
function getRetentionColor(retention: number): string {
  const hue = retention * 120; // 0-120 range (red to green)
  const saturation = 70;
  const lightness = 45 + (1 - retention) * 15;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Format number with commas
function formatNumber(n: number): string {
  return n.toLocaleString();
}

// Main App Component
function CohortHeatmapApp() {
  const [hostContext, setHostContext] = useState<
    McpUiHostContext | undefined
  >();
  const { app, error } = useApp({
    appInfo: IMPLEMENTATION,
    capabilities: {},
    onAppCreated: (app) => {
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

  if (error) return <div className={styles.error}>ERROR: {error.message}</div>;
  if (!app) return <div className={styles.loading}>Connecting...</div>;

  return <CohortHeatmapInner app={app} hostContext={hostContext} />;
}

// Inner App with state management
function CohortHeatmapInner({
  app,
  hostContext,
}: {
  app: App;
  hostContext?: McpUiHostContext;
}) {
  const [data, setData] = useState<CohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("retention");
  const [selectedPeriodType, setSelectedPeriodType] =
    useState<PeriodType>("monthly");
  const [highlightedCohort, setHighlightedCohort] = useState<number | null>(
    null,
  );
  const [highlightedPeriod, setHighlightedPeriod] = useState<number | null>(
    null,
  );
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await app.callServerTool({
        name: "get-cohort-data",
        arguments: {
          metric: selectedMetric,
          periodType: selectedPeriodType,
          cohortCount: 12,
          maxPeriods: 12,
        },
      });
      const text = result
        .content!.filter(
          (c): c is { type: "text"; text: string } => c.type === "text",
        )
        .map((c) => c.text)
        .join("");
      setData(JSON.parse(text) as CohortData);
    } catch (e) {
      console.error("Failed to fetch cohort data:", e);
    } finally {
      setLoading(false);
    }
  }, [app, selectedMetric, selectedPeriodType]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCellClick = useCallback(
    (cohortIndex: number, periodIndex: number) => {
      setHighlightedCohort(cohortIndex);
      setHighlightedPeriod(periodIndex);
    },
    [],
  );

  const handleMetricChange = useCallback((metric: MetricType) => {
    setSelectedMetric(metric);
    setHighlightedCohort(null);
    setHighlightedPeriod(null);
  }, []);

  const handlePeriodTypeChange = useCallback((periodType: PeriodType) => {
    setSelectedPeriodType(periodType);
    setHighlightedCohort(null);
    setHighlightedPeriod(null);
  }, []);

  return (
    <main
      className={styles.container}
      style={{
        paddingTop: hostContext?.safeAreaInsets?.top,
        paddingRight: hostContext?.safeAreaInsets?.right,
        paddingBottom: hostContext?.safeAreaInsets?.bottom,
        paddingLeft: hostContext?.safeAreaInsets?.left,
      }}
    >
      <Header
        selectedMetric={selectedMetric}
        selectedPeriodType={selectedPeriodType}
        onMetricChange={handleMetricChange}
        onPeriodTypeChange={handlePeriodTypeChange}
      />
      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : data ? (
        <HeatmapGrid
          data={data}
          highlightedCohort={highlightedCohort}
          highlightedPeriod={highlightedPeriod}
          onCellClick={handleCellClick}
          onCellHover={setTooltipData}
        />
      ) : (
        <div className={styles.error}>Failed to load data</div>
      )}
      <Legend />
      {tooltipData && <Tooltip {...tooltipData} />}
    </main>
  );
}

// Header with controls
interface HeaderProps {
  selectedMetric: MetricType;
  selectedPeriodType: PeriodType;
  onMetricChange: (metric: MetricType) => void;
  onPeriodTypeChange: (periodType: PeriodType) => void;
}

function Header({
  selectedMetric,
  selectedPeriodType,
  onMetricChange,
  onPeriodTypeChange,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Cohort Retention Analysis</h1>
      <div className={styles.controls}>
        <label className={styles.control}>
          <span>Metric:</span>
          <select
            value={selectedMetric}
            onChange={(e) => onMetricChange(e.target.value as MetricType)}
          >
            <option value="retention">Retention %</option>
            <option value="revenue">Revenue Retention</option>
            <option value="active">Active Users</option>
          </select>
        </label>
        <label className={styles.control}>
          <span>Period:</span>
          <select
            value={selectedPeriodType}
            onChange={(e) => onPeriodTypeChange(e.target.value as PeriodType)}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
      </div>
    </header>
  );
}

// Heatmap Grid
interface HeatmapGridProps {
  data: CohortData;
  highlightedCohort: number | null;
  highlightedPeriod: number | null;
  onCellClick: (cohortIndex: number, periodIndex: number) => void;
  onCellHover: (tooltip: TooltipData | null) => void;
}

function HeatmapGrid({
  data,
  highlightedCohort,
  highlightedPeriod,
  onCellClick,
  onCellHover,
}: HeatmapGridProps) {
  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `120px repeat(${data.periods.length}, 44px)`,
    }),
    [data.periods.length],
  );

  return (
    <div className={styles.heatmapWrapper}>
      <div className={styles.heatmapGrid} style={gridStyle}>
        {/* Header row: empty corner + period labels */}
        <div className={styles.headerCorner} />
        {data.periods.map((period, i) => (
          <div
            key={period}
            className={`${styles.headerPeriod} ${highlightedPeriod === i ? styles.highlighted : ""}`}
          >
            {period}
          </div>
        ))}

        {/* Data rows */}
        {data.cohorts.map((cohort, cohortIndex) => (
          <CohortRowComponent
            key={cohort.cohortId}
            cohort={cohort}
            cohortIndex={cohortIndex}
            periodCount={data.periods.length}
            periodLabels={data.periodLabels}
            isHighlighted={highlightedCohort === cohortIndex}
            highlightedPeriod={highlightedPeriod}
            onCellClick={onCellClick}
            onCellHover={onCellHover}
          />
        ))}
      </div>
    </div>
  );
}

// Cohort Row
interface CohortRowProps {
  cohort: CohortRow;
  cohortIndex: number;
  periodCount: number;
  periodLabels: string[];
  isHighlighted: boolean;
  highlightedPeriod: number | null;
  onCellClick: (cohortIndex: number, periodIndex: number) => void;
  onCellHover: (tooltip: TooltipData | null) => void;
}

function CohortRowComponent({
  cohort,
  cohortIndex,
  periodCount,
  periodLabels,
  isHighlighted,
  highlightedPeriod,
  onCellClick,
  onCellHover,
}: CohortRowProps) {
  return (
    <>
      <div
        className={`${styles.label} ${isHighlighted ? styles.highlighted : ""}`}
      >
        <span className={styles.cohortName}>{cohort.cohortLabel}</span>
        <span className={styles.cohortSize}>
          {formatNumber(cohort.originalUsers)}
        </span>
      </div>
      {Array.from({ length: periodCount }, (_, p) => {
        const cellData = cohort.cells.find((c) => c.periodIndex === p);
        const isCellHighlighted = isHighlighted || highlightedPeriod === p;

        if (!cellData) {
          return <div key={p} className={styles.cellEmpty} />;
        }

        return (
          <HeatmapCell
            key={p}
            cellData={cellData}
            cohort={cohort}
            periodLabel={periodLabels[p]}
            isHighlighted={isCellHighlighted}
            onClick={() => onCellClick(cohortIndex, p)}
            onHover={onCellHover}
          />
        );
      })}
    </>
  );
}

// Heatmap Cell
interface HeatmapCellProps {
  cellData: CohortCell;
  cohort: CohortRow;
  periodLabel: string;
  isHighlighted: boolean;
  onClick: () => void;
  onHover: (tooltip: TooltipData | null) => void;
}

function HeatmapCell({
  cellData,
  cohort,
  periodLabel,
  isHighlighted,
  onClick,
  onHover,
}: HeatmapCellProps) {
  const backgroundColor = useMemo(
    () => getRetentionColor(cellData.retention),
    [cellData.retention],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      onHover({
        x: rect.right + 8,
        y: rect.top,
        cohortLabel: cohort.cohortLabel,
        periodLabel,
        retention: cellData.retention,
        usersRetained: cellData.usersRetained,
        usersOriginal: cellData.usersOriginal,
      });
    },
    [cellData, cohort.cohortLabel, periodLabel, onHover],
  );

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  return (
    <div
      className={`${styles.cell} ${isHighlighted ? styles.highlighted : ""}`}
      style={{ backgroundColor }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {Math.round(cellData.retention * 100)}
    </div>
  );
}

// Tooltip
function Tooltip({
  x,
  y,
  cohortLabel,
  periodLabel,
  retention,
  usersRetained,
  usersOriginal,
}: TooltipData) {
  const style = useMemo(() => {
    let left = x;
    if (left + 200 > window.innerWidth) {
      left = x - 216;
    }
    return { left, top: y };
  }, [x, y]);

  return (
    <div className={styles.tooltip} style={style}>
      <div className={styles.tooltipHeader}>
        {cohortLabel} — {periodLabel}
      </div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipLabel}>Retention:</span>
        <span className={styles.tooltipValue}>
          {(retention * 100).toFixed(1)}%
        </span>
      </div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipLabel}>Users:</span>
        <span className={styles.tooltipValue}>
          {formatNumber(usersRetained)} / {formatNumber(usersOriginal)}
        </span>
      </div>
    </div>
  );
}

// Legend
function Legend() {
  return (
    <div className={styles.legend}>
      <span className={styles.legendItem}>
        <span
          className={styles.legendColor}
          style={{ backgroundColor: getRetentionColor(0.9) }}
        />
        80-100%
      </span>
      <span className={styles.legendItem}>
        <span
          className={styles.legendColor}
          style={{ backgroundColor: getRetentionColor(0.65) }}
        />
        50-79%
      </span>
      <span className={styles.legendItem}>
        <span
          className={styles.legendColor}
          style={{ backgroundColor: getRetentionColor(0.35) }}
        />
        20-49%
      </span>
      <span className={styles.legendItem}>
        <span
          className={styles.legendColor}
          style={{ backgroundColor: getRetentionColor(0.1) }}
        />
        0-19%
      </span>
    </div>
  );
}

// Entry point
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CohortHeatmapApp />
  </StrictMode>,
);
