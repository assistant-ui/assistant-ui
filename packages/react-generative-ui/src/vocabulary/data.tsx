import { z } from "zod";
import type { GenerativeUILibrary } from "../types";

const columnSchema = z.object({
  label: z.string().describe("Column header label."),
});

const cellSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .describe("A cell value.");

const CHART_HEIGHT = 40;
const CHART_WIDTH = 100;

const clampValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;

export const dataVocabulary = {
  Table: {
    description:
      "Tabular data. Provide `columns` and `rows`; each row is an array of cells matching the columns.",
    properties: z.object({
      columns: z.array(columnSchema).optional().describe("Column definitions."),
      rows: z.array(z.array(cellSchema)).optional().describe("Rows of cells."),
    }),
    render: ({ columns, rows, children }) => (
      <table data-aui="table">
        {columns?.length ? (
          <thead>
            <tr>
              {columns.map((c: { label: string }, i: number) => (
                <th key={i} data-aui="table-col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        {rows?.length ? (
          <tbody>
            {rows.map((row: (string | number | boolean)[], r: number) => (
              <tr key={r}>
                {row.map((cell: string | number | boolean, c: number) => (
                  <td key={c}>{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        ) : null}
        {children}
      </table>
    ),
  },
  Markdown: {
    description:
      "A markdown string. Rendered as-is by default; override this component for a full markdown renderer.",
    properties: z.object({
      value: z.string().describe("Markdown source."),
    }),
    streamProperties: true,
    render: ({ value, children }) => (
      <div data-aui="markdown">
        {value}
        {children}
      </div>
    ),
  },
  Chart: {
    description:
      "A chart. `variant` selects bar, line, or sparkline rendering; `data` is an ordered list of points.",
    properties: z.object({
      variant: z.enum(["bar", "line", "sparkline"]).describe("Chart variant."),
      data: z
        .array(
          z.object({
            label: z.string().optional(),
            value: z.number(),
          }),
        )
        .describe("Data points."),
      color: z.string().optional().describe("Series color."),
    }),
    render: ({ variant, data, color }) => {
      const points = Array.isArray(data) ? data : [];
      const n = points.length;
      const values = points.map((d) => clampValue(d?.value));
      const max = Math.max(0, ...values);
      const slot = n > 0 ? CHART_WIDTH / n : 0;
      const gap = slot * 0.2;
      const barWidth = slot - gap;

      return (
        <svg
          data-aui="chart"
          data-aui-variant={variant}
          data-aui-color={color}
          role="img"
          aria-label={`${variant} chart with ${n} data points`}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
        >
          {variant === "bar" ? (
            values.map((v, i) => {
              const height = max > 0 ? (v / max) * CHART_HEIGHT : 0;
              return (
                <rect
                  key={i}
                  x={i * slot + gap / 2}
                  y={CHART_HEIGHT - height}
                  width={barWidth}
                  height={height}
                  fill="currentColor"
                />
              );
            })
          ) : n === 1 ? (
            <circle
              cx={CHART_WIDTH / 2}
              cy={
                max > 0
                  ? CHART_HEIGHT - ((values[0] ?? 0) / max) * CHART_HEIGHT
                  : CHART_HEIGHT
              }
              r={2}
              fill="currentColor"
            />
          ) : n > 1 ? (
            <polyline
              points={values
                .map((v, i) => {
                  const x = n > 1 ? (i / (n - 1)) * CHART_WIDTH : 0;
                  const y =
                    max > 0
                      ? CHART_HEIGHT - (v / max) * CHART_HEIGHT
                      : CHART_HEIGHT;
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
            />
          ) : null}
        </svg>
      );
    },
  },
} satisfies GenerativeUILibrary;
