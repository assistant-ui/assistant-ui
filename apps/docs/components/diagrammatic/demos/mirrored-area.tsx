import { MirroredArea } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
  <MirroredArea
    title="Router throughput over one day"
    down={{ name: "download", data: [18, 30, 26, 40, 36, 48, 42, 52] }}
    up={{ name: "upload", data: [8, 12, 10, 16, 14, 18, 22, 16] }}
    labels={["00", "03", "06", "09", "12", "15", "18", "21"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Reservoir inflow and release through a wet season",
    setup:
      "A dam operator's season chart: river inflow above the axis, controlled releases below, November through June. The mirror form fits because the two flows literally oppose each other.",
    read: "Inflow peaks two months before releases do, and the lag is the point: that offset is the stored water doing its job. If the two halves ever peak together, the reservoir has stopped buffering and started merely passing water through.",
    chart: (
      <Paper
        kicker="Water"
        title="The reservoir's year"
        source="Source: dam operator logs"
      >
        <MirroredArea
          title="Reservoir inflow and release"
          down={{ name: "inflow", data: [22, 38, 54, 62, 48, 30, 18, 12] }}
          up={{ name: "release", data: [14, 16, 24, 38, 46, 40, 28, 18] }}
          labels={["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
        />
      </Paper>
    ),
  },
];
