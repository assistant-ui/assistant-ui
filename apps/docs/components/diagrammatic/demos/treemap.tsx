import { Treemap } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Terminal } from "./scenes";

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
    title: "Disk usage by directory",
    setup:
      "The laptop is full again, and the disk analyzer answers the only question that matters — what is actually taking the space — by drawing every directory as area, nested inside its parent.",
    read: "node_modules earns its rectangle honestly: bigger than src and dist combined. Area is bytes, so the eye finds the deletion target before any number is read; the nested cells inside src show the hierarchy without a tree control.",
    chart: (
      <Terminal title="disk usage — repo">
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
      </Terminal>
    ),
  },
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
  {
    title: "A grocery receipt by aisle",
    setup:
      "A budgeting app rolls a month of grocery receipts into aisles and draws the bill as area, because line-item lists hide the shape of a habit.",
    read: "The freezer aisle claims a bigger share of the bill than the produce section admits — $38 against $34 — and snacks quietly outspend dairy. The map makes the 'where does the food money go' conversation start from facts.",
    chart: (
      <AppCard title="Grocery bill by aisle" meta="$162">
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
      </AppCard>
    ),
  },
];
