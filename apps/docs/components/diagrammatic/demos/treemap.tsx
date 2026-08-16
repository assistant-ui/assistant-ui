import { Treemap } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "A national budget by area",
    setup:
      "A civics explainer draws the national budget to scale, because parliamentary debate time and actual spending have almost nothing to do with each other.",
    read: "Pensions and health together are most of the map, and everything argued about on television fits in the corner rectangles. Drawing money as area is the fastest cure for budget-debate proportion blindness.",
    chart: (
      <Paper
        kicker="Budget"
        title="The budget, to scale"
        source="Source: treasury outturn"
      >
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
      </Paper>
    ),
  },
];
