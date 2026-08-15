import { PopulationPyramid } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Age structure of a stable country",
    note: "A gentle barrel: wide working decades, tapering ends, no missing cohorts.",
    chart: (
      <PopulationPyramid
        title="Age structure"
        bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
        left={{ name: "men", data: [22, 38, 56, 68, 76, 60, 42, 22] }}
        right={{ name: "women", data: [28, 42, 58, 64, 70, 56, 40, 24] }}
      />
    ),
  },
  {
    title: "A retirement town",
    note: "Top-heavy and thin at the base; the school district closed for a reason.",
    chart: (
      <PopulationPyramid
        title="Retirement town"
        bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
        left={{ name: "men", data: [58, 72, 54, 30, 20, 14, 10, 8] }}
        right={{ name: "women", data: [74, 78, 56, 32, 22, 15, 11, 8] }}
      />
    ),
  },
  {
    title: "A college town in term time",
    note: "One enormous cohort in the twenties, then the town empties out both ways.",
    chart: (
      <PopulationPyramid
        title="College town"
        bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
        left={{ name: "men", data: [10, 14, 18, 22, 30, 88, 26, 12] }}
        right={{ name: "women", data: [12, 16, 20, 24, 32, 94, 28, 12] }}
      />
    ),
  },
];
