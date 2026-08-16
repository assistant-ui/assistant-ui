import { Area } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

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
    read: "July and August did their job inside the band; the early September collapse sits outside it, which is what makes it a warning rather than noise. One area, one annotation, and the argument for the winter rationing plan is complete.",
    chart: (
      <Paper
        kicker="Water"
        title="A monsoon in millimetres"
        source="Source: reservoir authority gauge, monthly totals"
      >
        <Area
          title="Weekly rainfall"
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
      </Paper>
    ),
  },
];
