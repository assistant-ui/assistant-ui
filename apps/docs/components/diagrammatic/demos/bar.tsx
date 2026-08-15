import { Bar, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Weekly npm downloads across frameworks",
    note: "Ranked and labeled at the bar; the gap between first and second is the point.",
    chart: (
      <Bar
        title="Weekly npm downloads"
        items={[
          { label: "react", value: 25_000_000 },
          { label: "vue", value: 12_000_000 },
          { label: "svelte", value: 6_200_000 },
          { label: "solid", value: 2_100_000 },
          { label: "qwik", value: 900_000 },
        ]}
      />
    ),
  },
  {
    title: "Catalog size by streaming service",
    note: "Titles in the library, ranked; the long tail of services starts two bars down.",
    chart: (
      <Bar
        title="Catalog size"
        items={[
          { label: "prime", value: 26_000 },
          { label: "netflix", value: 16_000 },
          { label: "max", value: 9_400 },
          { label: "disney+", value: 7_200 },
          { label: "apple", value: 1_100 },
        ]}
        format={(v) => formatCompact(v)}
      />
    ),
  },
  {
    title: "Protein per hundred grams",
    note: "Everyday foods on one scale; lentils sit closer to chicken than most people guess.",
    chart: (
      <Bar
        title="Protein per 100g"
        items={[
          { label: "chicken", value: 31 },
          { label: "lentils", value: 25 },
          { label: "eggs", value: 13 },
          { label: "tofu", value: 8 },
          { label: "yogurt", value: 10 },
        ]}
        format={(v) => `${v}g`}
      />
    ),
  },
];
