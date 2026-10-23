import { Area } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Area
    title="Cumulative signups"
    data={[2200, 4000, 3400, 5200, 6400, 5800, 7400, 7000, 8800]}
    labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "A monsoon in millimetres, its core annotated",
    setup:
      "Sixteen weekly rainfall totals form the area. The core monsoon band marks the high-rainfall stretch in July and August.",
    read: "Rainfall rises above the 200mm fill stage in the second week of July and stays above it through the fourth week of August. Those seven totals exceed the guide. The first week of September falls to 150mm.",
    source: "Illustrative weekly rainfall totals.",
    chart: (
      <FigTooltip
        labels={[
          "Jun w1",
          "Jun w2",
          "Jun w3",
          "Jun w4",
          "Jul w1",
          "Jul w2",
          "Jul w3",
          "Jul w4",
          "Aug w1",
          "Aug w2",
          "Aug w3",
          "Aug w4",
          "Sep w1",
          "Sep w2",
          "Sep w3",
          "Sep w4",
        ]}
        series={{
          rainfall: [
            30, 55, 85, 130, 185, 240, 310, 340, 325, 290, 260, 205, 150, 95,
            60, 25,
          ],
        }}
        unit="mm"
      >
        <Area
          aspect={2.2}
          title="Weekly rainfall"
          yTicks={[
            { at: 0, label: "0" },
            { at: 150, label: "150" },
            { at: 300, label: "300" },
          ]}
          data={[
            30, 55, 85, 130, 185, 240, 310, 340, 325, 290, 260, 205, 150, 95,
            60, 25,
          ]}
          regions={[{ from: 5, to: 11, label: "core monsoon" }]}
          guides={[{ at: 200, label: "fill stage 200mm" }]}
          labels={[
            "Jun",
            "",
            "",
            "",
            "Jul",
            "",
            "",
            "",
            "Aug",
            "",
            "",
            "",
            "Sep",
            "",
            "",
            "",
          ]}
          format={(v) => `${v}mm`}
        />
      </FigTooltip>
    ),
  },
];
