import { PolarArea } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const HOURS = Array.from({ length: 24 }, (_, hour) => {
  const label = String(hour).padStart(2, "0");
  if (hour >= 0 && hour < 6)
    return { label, value: [18, 14, 11, 9, 8, 10][hour]! };
  if (hour < 12) return { label, value: [16, 22, 28, 34, 31, 27][hour - 6]! };
  if (hour < 18) return { label, value: [29, 33, 38, 52, 61, 48][hour - 12]! };
  return { label, value: [36, 28, 24, 22, 21, 19][hour - 18]! };
});

export const glyph = (
  <PolarArea
    title="Arrivals by hour"
    items={HOURS.filter((_, i) => i % 3 === 0)}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Trauma arrivals by hour, one year",
    setup:
      "A Nightingale rose for a city hospital: twenty-four hours around the clock, radius as volume. The form exists for a cycle, not a ranking.",
    read: "The afternoon swell from 15h to 17h is the road. The 03h dent is the quiet the night shift actually gets. Area grows with the square of radius, so 61 at 16h looks larger than the 18-to-61 ratio; the tooltip keeps the count honest.",
    source: "ED trauma desk, 2024. n = 6,412 arrivals.",
    chart: (
      <FigTooltip
        labels={HOURS.map((row) => `${row.label}h`)}
        series={{ arrivals: HOURS.map((row) => row.value) }}
      >
        <PolarArea
          density="figure"
          aspect={1.15}
          title="Trauma arrivals by hour"
          items={HOURS}
        />
      </FigTooltip>
    ),
  },
];
