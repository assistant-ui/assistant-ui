import { DivergingBar } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper, Report, Slide } from "./scenes";

export const glyph = (
  <DivergingBar
    title="Revenue against plan"
    items={[
      { label: "cloud", value: 48 },
      { label: "search", value: 34 },
      { label: "mail", value: 26 },
      { label: "iot", value: 18 },
      { label: "maps", value: -12 },
      { label: "ads", value: -22 },
      { label: "video", value: -38 },
    ]}
    format={(v) => `${v}%`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Revenue against plan, by product",
    setup:
      "The quarterly business review opens with every product's revenue versus plan. Zero is the plan; direction is the verdict, delivered before any number is read.",
    read: "Cloud beats plan by 48% while video misses by 38 — the same information as a table of eight percentages, but the room splits into 'above the line' and 'below the line' in one second. Video's bar is why agenda item two exists.",
    chart: (
      <Report
        title="Revenue vs plan"
        chip="QBR"
        note="Variance to plan by product line, percent."
      >
        <DivergingBar
          title="Revenue against plan"
          items={[
            { label: "cloud", value: 48 },
            { label: "search", value: 34 },
            { label: "mail", value: 26 },
            { label: "iot", value: 18 },
            { label: "maps", value: -12 },
            { label: "ads", value: -22 },
            { label: "video", value: -38 },
          ]}
          format={(v) => `${v}%`}
        />
      </Report>
    ),
  },
  {
    title: "Vote swing by district",
    setup:
      "The election-night graphics desk shows each district's swing since the last vote. The zero line is the status quo, and every bar is a district changing its mind.",
    read: "The suburbs moved one way and the city the other — a seven-district story with a single visible fault line. Harbor's +6.4 and hills' −7.8 bracket a realignment that the citywide total, hovering near zero, completely conceals.",
    chart: (
      <Paper
        kicker="Election"
        title="The swing map"
        source="Source: district returns"
      >
        <DivergingBar
          title="Swing since last election"
          items={[
            { label: "harbor", value: 6.4 },
            { label: "northside", value: 4.1 },
            { label: "old town", value: 1.8 },
            { label: "riverbend", value: -0.9 },
            { label: "midtown", value: -2.6 },
            { label: "westgate", value: -5.2 },
            { label: "hills", value: -7.8 },
          ]}
          format={(v) => `${v}pp`}
        />
      </Paper>
    ),
  },
  {
    title: "Trade balance by category",
    setup:
      "A trade ministry's annual chart: exports minus imports per category, surpluses above the line, deficits below.",
    read: "The deficit is visibly a machinery story — its bar below the line is longer than services' bar above it. Food and chemicals barely register either way; the whole national argument is really two bars talking past each other.",
    chart: (
      <Slide title="Trade balance" footer="ministry annual">
        <DivergingBar
          title="Trade balance by category"
          items={[
            { label: "services", value: 42 },
            { label: "food", value: 18 },
            { label: "chemicals", value: 9 },
            { label: "textiles", value: -14 },
            { label: "energy", value: -26 },
            { label: "machinery", value: -48 },
          ]}
          format={(v) => `$${Math.abs(v)}B`}
        />
      </Slide>
    ),
  },
];
