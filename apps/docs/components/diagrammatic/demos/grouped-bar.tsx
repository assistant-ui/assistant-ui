import { GroupedBar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
  <GroupedBar
    title="Signups by region and plan"
    groups={["NA", "EU", "APAC"]}
    series={[
      { name: "free", data: [46, 62, 78] },
      { name: "pro", data: [34, 48, 55] },
      { name: "team", data: [20, 36, 30] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Medal table, three games",
    setup:
      "A sports desk builds the medal graphic that runs every two years: five countries, three metals, side by side because gold-vs-gold is the comparison headlines are made of.",
    read: "USA and China trade blows on gold while Britain's bronze bar outruns its gold — a depth-of-field story, not a podium-topping one — and Japan beats Australia on gold while losing to it on total. The grouped form keeps each metal's race separate; stacking them would bury the only number anyone quotes.",
    chart: (
      <Paper kicker="Games" title="The medal table">
        <FigTooltip
          labels={["USA", "CHN", "GBR", "JPN", "AUS"]}
          series={{
            gold: [40, 38, 14, 20, 18],
            silver: [44, 32, 22, 12, 19],
            bronze: [42, 19, 29, 13, 16],
          }}
          total
        >
          <GroupedBar
            title="Medals by country"
            groups={["USA", "CHN", "GBR", "JPN", "AUS"]}
            series={[
              { name: "gold", data: [40, 38, 14, 20, 18] },
              { name: "silver", data: [44, 32, 22, 12, 19] },
              { name: "bronze", data: [42, 19, 29, 13, 16] },
            ]}
            yTicks={[
              { at: 0, label: "0" },
              { at: 20, label: "20" },
              { at: 40, label: "40" },
            ]}
          />
        </FigTooltip>
      </Paper>
    ),
  },
];
