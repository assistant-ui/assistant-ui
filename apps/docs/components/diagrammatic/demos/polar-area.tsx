import { PolarArea } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
  <PolarArea
    title="Wind hours by direction"
    items={[
      { label: "N", value: 86 },
      { label: "NE", value: 52 },
      { label: "E", value: 71 },
      { label: "SE", value: 38 },
      { label: "S", value: 59 },
      { label: "SW", value: 28 },
      { label: "W", value: 47 },
      { label: "NW", value: 66 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Wind hours by direction",
    setup:
      "A kitesurf school decides where to build its new launch from a year of anemometer logs. The wind rose is the oldest polar chart there is: direction as angle, hours as radius.",
    read: "North and east own this coastline — the rose points where the wind comes from, and the northeast quadrant holds most of the year's sailable hours. The southwest sliver is why the old launch site kept disappointing.",
    chart: (
      <Paper
        kicker="Coast"
        title="Where the wind lives"
        source="Source: harbor anemometer, one year"
      >
        <FigTooltip
          labels={["N", "NE", "E", "SE", "S", "SW", "W", "NW"]}
          series={{ hours: [86, 52, 71, 38, 59, 28, 47, 66] }}
          unit="h"
        >
          <PolarArea
            title="Wind hours by direction"
            items={[
              { label: "N", value: 86 },
              { label: "NE", value: 52 },
              { label: "E", value: 71 },
              { label: "SE", value: 38 },
              { label: "S", value: 59 },
              { label: "SW", value: 28 },
              { label: "W", value: 47 },
              { label: "NW", value: 66 },
            ]}
          />
        </FigTooltip>
      </Paper>
    ),
  },
];
