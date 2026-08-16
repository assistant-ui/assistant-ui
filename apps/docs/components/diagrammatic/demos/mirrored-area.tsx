import { MirroredArea } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

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
    read: "Inflow peaks two months before releases do. That lag is the stored water doing its job. If the two halves ever peak together, the reservoir has stopped buffering and started passing the river through.",
    source: "Dam operator logs, fortnightly means.",
    chart: (
      <FigTooltip
        labels={[
          "Nov a",
          "Nov b",
          "Dec a",
          "Dec b",
          "Jan a",
          "Jan b",
          "Feb a",
          "Feb b",
          "Mar a",
          "Mar b",
          "Apr a",
          "Apr b",
          "May a",
          "May b",
          "Jun a",
          "Jun b",
        ]}
        series={{
          inflow: [
            18, 24, 34, 46, 56, 62, 58, 50, 40, 32, 24, 18, 14, 11, 10, 9,
          ],
          release: [
            12, 14, 15, 18, 24, 32, 40, 46, 44, 40, 34, 28, 22, 18, 15, 13,
          ],
        }}
        unit="m³/s"
      >
        <MirroredArea
          density="figure"
          aspect={2.2}
          title="Reservoir inflow and release"
          down={{
            name: "inflow",
            data: [
              18, 24, 34, 46, 56, 62, 58, 50, 40, 32, 24, 18, 14, 11, 10, 9,
            ],
          }}
          up={{
            name: "release",
            data: [
              12, 14, 15, 18, 24, 32, 40, 46, 44, 40, 34, 28, 22, 18, 15, 13,
            ],
          }}
          labels={[
            "Nov",
            "",
            "Dec",
            "",
            "Jan",
            "",
            "Feb",
            "",
            "Mar",
            "",
            "Apr",
            "",
            "May",
            "",
            "Jun",
            "",
          ]}
        />
      </FigTooltip>
    ),
  },
];
