import { DivergingBar } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

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
    read: "Cloud beats plan by 48% while video misses by 38 — the same information as a table of ten percentages, but the room splits into 'above the line' and 'below the line' in one second: six products above, four below, and the misses get steeper as the list descends. Video's bar is why agenda item two exists.",
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
            { label: "docs", value: 9 },
            { label: "gaming", value: 4 },
            { label: "maps", value: -12 },
            { label: "ads", value: -22 },
            { label: "music", value: -29 },
            { label: "video", value: -38 },
          ]}
          format={(v) => `${v}%`}
        />
      </Report>
    ),
  },
];
