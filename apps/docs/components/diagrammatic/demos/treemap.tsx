import { Treemap } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Disk usage by directory",
    note: "Area is bytes; node_modules earns its rectangle honestly.",
    chart: (
      <Treemap
        title="Disk usage by directory"
        root={{
          label: "repo",
          children: [
            { label: "node_modules", value: 2.1 },
            {
              label: "src",
              children: [
                { label: "app", value: 0.5 },
                { label: "assets", value: 0.34 },
              ],
            },
            {
              label: "dist",
              children: [
                { label: "js", value: 0.38 },
                { label: ".git", value: 0.28 },
              ],
            },
            { label: "cache", value: 0.2 },
          ],
        }}
        format={(v) => `${v} GB`}
      />
    ),
  },
  {
    title: "A national budget by area",
    note: "Pensions and health together are most of the map; everything argued about on TV fits in the corner.",
    chart: (
      <Treemap
        title="Budget by area"
        root={{
          label: "budget",
          children: [
            {
              label: "social",
              children: [
                { label: "pensions", value: 310 },
                { label: "welfare", value: 140 },
              ],
            },
            { label: "health", value: 280 },
            { label: "education", value: 130 },
            {
              label: "other",
              children: [
                { label: "defense", value: 90 },
                { label: "transport", value: 60 },
              ],
            },
          ],
        }}
        format={(v) => `$${v}B`}
      />
    ),
  },
  {
    title: "A grocery receipt by aisle",
    note: "The freezer aisle is a bigger share of the bill than the produce section admits.",
    chart: (
      <Treemap
        title="Grocery bill by aisle"
        root={{
          label: "bill",
          children: [
            {
              label: "fresh",
              children: [
                { label: "produce", value: 34 },
                { label: "meat", value: 42 },
                { label: "dairy", value: 22 },
              ],
            },
            { label: "frozen", value: 38 },
            { label: "pantry", value: 30 },
            { label: "snacks", value: 18 },
          ],
        }}
        format={(v) => `$${v}`}
      />
    ),
  },
];
