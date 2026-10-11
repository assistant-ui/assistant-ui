import { z } from "zod";
import type { VocabularyDefinition } from "./types";

const columnSchema = z.object({
  label: z.string().describe("Column header label."),
  align: z.enum(["start", "end"]).optional().describe("Cell alignment."),
  format: z
    .object({
      kind: z
        .enum(["number", "currency", "percent", "date"])
        .describe(
          "Format kind. `percent` takes a fraction, so 0.25 renders as 25%.",
        ),
      currency: z.string().optional().describe("Currency code."),
      decimals: z.number().optional().describe("Decimal places."),
    })
    .optional()
    .describe("Cell value format."),
});

const cellSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .describe("A cell value.");

const pointSchema = z.object({
  label: z.string().optional().describe("Point label."),
  value: z.number().describe("Point value."),
});

const seriesSchema = z.object({
  label: z.string().optional().describe("Series label, shown in the legend."),
  color: z
    .string()
    .optional()
    .describe(
      "Series color. One of `emphasis`, `secondary`, `alpha-70`, `white`, `white-70`, or `white-50`, matching Text's `color` tokens; other values have no visual effect.",
    ),
  data: z.array(pointSchema).describe("Data points for this series."),
});

export const dataDefinitions = {
  Table: {
    description:
      "Tabular data. Provide `columns` and `rows`; each row is an array of cells matching the columns.",
    properties: z.object({
      columns: z.array(columnSchema).optional().describe("Column definitions."),
      rows: z.array(z.array(cellSchema)).optional().describe("Rows of cells."),
      sortable: z.boolean().optional().describe("Allow header sorting."),
    }),
  },
  Markdown: {
    description:
      "A markdown string. Rendered as-is by default; override this component for a full markdown renderer.",
    properties: z.object({
      value: z.string().describe("Markdown source."),
    }),
    streamProperties: true,
  },
  Chart: {
    description:
      "A chart. `variant` selects bar, line, sparkline, or area rendering. Provide `data` for a single series, or `series` for multiple named series (`series` takes precedence over `data` when both are present). Set `stacked` to accumulate series values instead of overlaying them, and `showAxis`/`showLegend` to add y-axis ticks, x-axis point labels, and a legend.",
    properties: z.object({
      variant: z
        .enum(["bar", "line", "sparkline", "area"])
        .describe("Chart variant."),
      data: z
        .array(pointSchema)
        .optional()
        .describe("Data points for a single series."),
      series: z
        .array(seriesSchema)
        .optional()
        .describe(
          "Multiple named series; takes precedence over `data` when present.",
        ),
      stacked: z
        .boolean()
        .optional()
        .describe(
          "Accumulate series values instead of overlaying them (bar and area variants; ignored for line and sparkline).",
        ),
      showAxis: z
        .boolean()
        .optional()
        .describe("Show y-axis ticks and x-axis point labels."),
      showLegend: z
        .boolean()
        .optional()
        .describe("Show a legend mapping each series to its color."),
      color: z
        .string()
        .optional()
        .describe(
          "Series color (single-series mode only). One of `emphasis`, `secondary`, `alpha-70`, `white`, `white-70`, or `white-50`, matching Text's `color` tokens; other values have no visual effect.",
        ),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
