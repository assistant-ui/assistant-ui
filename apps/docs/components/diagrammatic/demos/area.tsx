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
      "A reservoir engineer's season chart, complete: sixteen weeks of rainfall as filled area, and a regions band marking the core monsoon — the six weeks the water year is actually decided in. The area under the curve is the town's supply; the band says which part of it is structural.",
    read: "July and August did their job inside the band. The September collapse sits outside it, which is what makes it a warning rather than weather. The area under the curve is the town's water; the band says which weeks actually filled the reservoir.",
    source: "Reservoir authority gauge, weekly totals.",
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
          density="figure"
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
