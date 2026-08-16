import { DivergingBar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

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
      "Zero is the plan. The form sorts itself. Direction is the verdict before any number is read.",
    read: "Cloud is 48% over. Video is 38% under. Six products above the line, four below, and the misses get steeper as the list descends. Video is why agenda item two exists.",
    source: "Q2 2025 revenue versus the January plan.",
    chart: (
      <FigTooltip
        labels={[
          "cloud",
          "search",
          "mail",
          "iot",
          "docs",
          "gaming",
          "maps",
          "ads",
          "music",
          "video",
        ]}
        series={{
          "vs plan": [
            "+48%",
            "+34%",
            "+26%",
            "+18%",
            "+9%",
            "+4%",
            "-12%",
            "-22%",
            "-29%",
            "-38%",
          ],
        }}
      >
        <DivergingBar
          density="figure"
          aspect={1.2}
          title="Revenue against plan"
          sorted
          items={[
            { label: "maps", value: -12 },
            { label: "cloud", value: 48 },
            { label: "docs", value: 9 },
            { label: "video", value: -38 },
            { label: "search", value: 34 },
            { label: "gaming", value: 4 },
            { label: "ads", value: -22 },
            { label: "mail", value: 26 },
            { label: "music", value: -29 },
            { label: "iot", value: 18 },
          ]}
          format={(v) => `${v}%`}
        />
      </FigTooltip>
    ),
  },
];
