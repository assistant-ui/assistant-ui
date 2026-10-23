import { StackedArea } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const HOURS = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, "0"));
const GAS = [
  15, 14, 13, 13, 12, 11, 9, 7, 6, 5, 4, 4, 5, 5, 6, 8, 10, 15, 19, 22, 22, 21,
  19, 17, 16,
];
const NUCLEAR = Array.from({ length: 25 }, () => 8);
const WIND = [
  9, 10, 10, 9, 9, 8, 8, 7, 7, 7, 8, 8, 8, 7, 7, 8, 8, 8, 9, 9, 10, 10, 10, 9,
  9,
];
const SOLAR = [
  0, 0, 0, 0, 0, 0, 1, 3, 6, 10, 13, 15, 16, 15, 13, 10, 7, 4, 1, 0, 0, 0, 0, 0,
  0,
];

export const glyph = (
  <StackedArea
    title="Site traffic by channel"
    labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
    series={[
      { name: "search", data: [16, 20, 18, 24, 26, 24, 30, 34] },
      { name: "direct", data: [10, 12, 16, 14, 18, 22, 20, 24] },
      { name: "social", data: [8, 8, 10, 12, 10, 14, 16, 14] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Grid generation mix across one day",
    setup:
      "A grid operator's dashboard shows the day's generation stacked by source, because demand must always equal the top edge. This is a sunny weekday in spring.",
    read: "Solar swells through midday and gas fills the morning and evening shoulders around it. Demand peaks at 40 GW at 20:00, above the midday 37 GW: solar is already gone, so gas has to climb back. Nuclear is a flat floor; wind ignores the sun.",
    source: "Spring weekday, one control area. Gigawatts at the hour.",
    chart: (
      <FigTooltip
        labels={HOURS}
        series={{ gas: GAS, nuclear: NUCLEAR, wind: WIND, solar: SOLAR }}
        unit="GW"
        total
      >
        <StackedArea
          aspect={2.2}
          title="Generation mix"
          yTicks={[
            { at: 0, label: "0" },
            { at: 20, label: "20" },
            { at: 40, label: "40" },
          ]}
          guides={[{ at: 40, label: "evening peak" }]}
          labels={[
            "00",
            "",
            "",
            "06",
            "",
            "",
            "12",
            "",
            "",
            "18",
            "",
            "",
            "24",
          ]}
          series={[
            { name: "gas", data: GAS },
            { name: "nuclear", data: NUCLEAR },
            { name: "wind", data: WIND },
            { name: "solar", data: SOLAR },
          ]}
        />
      </FigTooltip>
    ),
  },
];
