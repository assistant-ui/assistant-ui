import { z } from "zod";
import type { GenerativeUILibrary } from "../types";

const columnSchema = z.object({
  label: z.string().describe("Column header label."),
});

const cellSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .describe("A cell value.");

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
      "A chart placeholder. Carries variant and data for a client renderer to draw.",
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
    render: ({ variant, data, color }) => (
      <div
        data-aui="chart"
        data-aui-variant={variant}
        data-aui-color={color}
        data-aui-data={JSON.stringify(data)}
      />
    ),
  },
} satisfies GenerativeUILibrary;
