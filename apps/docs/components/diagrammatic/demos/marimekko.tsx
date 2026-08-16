import { Marimekko } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const COLUMNS = [
  {
    label: "NA",
    width: 48,
    shares: [
      { label: "aws", value: 31 },
      { label: "azure", value: 9 },
      { label: "gcp", value: 6 },
      { label: "other", value: 2 },
    ],
  },
  {
    label: "EU",
    width: 27,
    shares: [
      { label: "aws", value: 12 },
      { label: "azure", value: 8 },
      { label: "gcp", value: 5 },
      { label: "other", value: 2 },
    ],
  },
  {
    label: "APAC",
    width: 19,
    shares: [
      { label: "aws", value: 8 },
      { label: "azure", value: 4 },
      { label: "gcp", value: 5 },
      { label: "other", value: 2 },
    ],
  },
  {
    label: "LATAM",
    width: 6,
    shares: [
      { label: "aws", value: 3 },
      { label: "azure", value: 1 },
      { label: "gcp", value: 1 },
      { label: "other", value: 1 },
    ],
  },
];

export const glyph = (
  <Marimekko
    title="Market by region"
    columns={COLUMNS.slice(0, 3).map((column) => ({
      ...column,
      shares: column.shares.slice(0, 3),
    }))}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Cloud spend, region by vendor",
    setup:
      "Width is the region's share of the bill. Height inside a column is the vendor. The cell that matters is the one you annotate.",
    read: "NA is half the rectangle, and AWS is two-thirds of NA. That one cell is 31 of 100. Azure only competes in the EU column. APAC is the only place GCP is even with Azure.",
    source: "FY25 cloud invoice, share of $6.74m. Cells sum to 100.",
    chart: (
      <FigTooltip
        matrix={{
          rows: ["aws", "azure", "gcp", "other"],
          columns: ["NA", "EU", "APAC", "LATAM"],
          values: [
            [31, 12, 8, 3],
            [9, 8, 4, 1],
            [6, 5, 5, 1],
            [2, 2, 2, 1],
          ],
        }}
        unit="%"
      >
        <Marimekko
          density="figure"
          aspect={1.7}
          title="Cloud spend by region and vendor"
          columns={COLUMNS}
        />
      </FigTooltip>
    ),
  },
];
