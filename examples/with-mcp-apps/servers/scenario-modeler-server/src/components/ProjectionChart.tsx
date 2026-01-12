import { useRef, useEffect } from "react";
import { Chart, registerables } from "chart.js";
import { useTheme } from "../hooks/useTheme.ts";
import type { MonthlyProjection } from "../types.ts";

Chart.register(...registerables);

interface ProjectionChartProps {
  userProjections: MonthlyProjection[];
  templateProjections: MonthlyProjection[] | null;
  templateName?: string;
}

export function ProjectionChart({
  userProjections,
  templateProjections,
  templateName,
}: ProjectionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const theme = useTheme();

  // Create chart on mount, rebuild on theme change
  useEffect(() => {
    if (!canvasRef.current) return;

    const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";
    const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: Array.from({ length: 12 }, (_, i) => `M${i + 1}`),
        datasets: [
          // User scenario (solid lines)
          {
            label: "MRR",
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            data: [],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: "Gross Profit",
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            data: [],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: "Net Profit",
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            data: [],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
          },
          // Template comparison (dashed lines)
          {
            label: "Template MRR",
            borderColor: "#3b82f6",
            borderDash: [5, 5],
            data: [],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.5,
            hidden: true,
          },
          {
            label: "Template Gross",
            borderColor: "#10b981",
            borderDash: [5, 5],
            data: [],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.5,
            hidden: true,
          },
          {
            label: "Template Net",
            borderColor: "#f59e0b",
            borderDash: [5, 5],
            data: [],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.5,
            hidden: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
            titleColor: theme === "dark" ? "#f9fafb" : "#111827",
            bodyColor: theme === "dark" ? "#9ca3af" : "#6b7280",
            borderColor: gridColor,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                if (value === null) return "";
                const formatted =
                  Math.abs(value) >= 1000
                    ? `$${(value / 1000).toFixed(1)}K`
                    : `$${value.toFixed(0)}`;
                return `${context.dataset.label}: ${formatted}`;
              },
            },
          },
        },
        scales: {
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (value) => {
                const num = Number(value);
                if (Math.abs(num) >= 1000) {
                  return `$${(num / 1000).toFixed(0)}K`;
                }
                return `$${num}`;
              },
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [theme]);

  // Update data when projections change
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    chart.data.datasets[0].data = userProjections.map((p) => p.mrr);
    chart.data.datasets[1].data = userProjections.map((p) => p.grossProfit);
    chart.data.datasets[2].data = userProjections.map((p) => p.netProfit);

    if (templateProjections) {
      chart.data.datasets[3].data = templateProjections.map((p) => p.mrr);
      chart.data.datasets[4].data = templateProjections.map(
        (p) => p.grossProfit,
      );
      chart.data.datasets[5].data = templateProjections.map((p) => p.netProfit);
      chart.data.datasets[3].hidden = false;
      chart.data.datasets[4].hidden = false;
      chart.data.datasets[5].hidden = false;
    } else {
      chart.data.datasets[3].hidden = true;
      chart.data.datasets[4].hidden = true;
      chart.data.datasets[5].hidden = true;
    }

    chart.update("none"); // Skip animation for smoother slider updates
  }, [userProjections, templateProjections]);

  return (
    <section className="chart-section">
      <h2 className="section-title">12-Month Projection</h2>
      <div className="chart-container">
        <canvas ref={canvasRef} />
      </div>
      <div className="chart-legend">
        <span className="legend-item">
          <span style={{ color: "#3b82f6" }}>--</span> MRR
        </span>
        <span className="legend-item">
          <span style={{ color: "#10b981" }}>--</span> Gross Profit
        </span>
        <span className="legend-item">
          <span style={{ color: "#f59e0b" }}>--</span> Net Profit
        </span>
        {templateProjections && (
          <span className="legend-item legend-template">
            (dashed = {templateName})
          </span>
        )}
      </div>
    </section>
  );
}
