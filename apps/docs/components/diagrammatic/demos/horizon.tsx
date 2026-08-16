import { Horizon } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

function load(peakHour: number, night = 1.4, peak = 9.2): number[] {
  return Array.from({ length: 24 }, (_, h) => {
    const d = Math.min(Math.abs(h - peakHour), 24 - Math.abs(h - peakHour));
    return (
      Math.round((night + (peak - night) * Math.exp(-((d * d) / 18))) * 10) / 10
    );
  });
}

const FLEET = [
  { name: "api-1a", data: load(11, 1.6, 9.4) },
  { name: "api-1b", data: load(11, 1.5, 8.8) },
  { name: "api-2a", data: load(10, 1.8, 7.6) },
  { name: "worker-a", data: load(14, 0.8, 9.8) },
  { name: "worker-b", data: load(15, 0.9, 8.4) },
  { name: "jobs", data: load(2, 2.2, 9.1) },
  { name: "edge-w", data: load(9, 1.2, 6.4) },
  { name: "edge-e", data: load(16, 1.1, 6.8) },
];

export const glyph = (
  <Horizon
    title="Server load across 24 hours"
    data={[
      2, 3.5, 5, 4.2, 6, 7.5, 6.2, 8, 9.5, 8.5, 7, 9, 6.5, 5, 6, 4.5, 3, 4,
    ]}
    bands={3}
    labels={["00", "06", "12", "18", "24"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Fleet load, eight hosts, one day",
    setup:
      "A dashboard that has eight hosts and eight rows of height. Each strip is a full day folded three times. Darker means a higher fold, not a different host.",
    read: "The API pair peaks together at 11. Workers peak later, after the queue fills. Jobs burns at 02:00, which is the batch window. The two edge rows stay pale all day. A line chart of this fleet would not fit on the page.",
    source: "Requests per second, hourly. Darker fold is higher load.",
    chart: (
      <FigTooltip
        labels={Array.from(
          { length: 24 },
          (_, h) => `${String(h).padStart(2, "0")}:00`,
        )}
        series={Object.fromEntries(FLEET.map((row) => [row.name, row.data]))}
        unit="k rps"
      >
        <Horizon
          density="figure"
          aspect={2}
          title="Fleet load across 24 hours"
          series={FLEET}
          bands={3}
          labels={["00", "06", "12", "18"]}
        />
      </FigTooltip>
    ),
  },
];
