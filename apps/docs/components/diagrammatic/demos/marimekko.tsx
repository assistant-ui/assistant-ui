import { Marimekko } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const COLUMNS = [
  {
    label: "NA",
    width: 48,
    shares: [
      { label: "vendor A", value: 31 },
      { label: "vendor B", value: 9 },
      { label: "vendor C", value: 6 },
      { label: "other", value: 2 },
    ],
  },
  {
    label: "EU",
    width: 27,
    shares: [
      { label: "vendor A", value: 12 },
      { label: "vendor B", value: 8 },
      { label: "vendor C", value: 5 },
      { label: "other", value: 2 },
    ],
  },
  {
    label: "APAC",
    width: 19,
    shares: [
      { label: "vendor A", value: 8 },
      { label: "vendor B", value: 4 },
      { label: "vendor C", value: 5 },
      { label: "other", value: 2 },
    ],
  },
  {
    label: "LATAM",
    width: 6,
    shares: [
      { label: "vendor A", value: 3 },
      { label: "vendor B", value: 1 },
      { label: "vendor C", value: 1 },
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
    read: "NA covers 48% of the rectangle, and vendor A takes 31 of those 48 points. Vendor B has 8 points against vendor A's 12 in EU. In APAC, vendor C exceeds vendor B, 5 to 4.",
    source: "Illustrative FY25 cloud spend shares. Cells sum to 100.",
    chart: (
      <FigTooltip
        matrix={{
          rows: ["vendor A", "vendor B", "vendor C", "other"],
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
          aspect={1.7}
          title="Cloud spend by region and vendor"
          columns={COLUMNS}
        />
      </FigTooltip>
    ),
  },
];
