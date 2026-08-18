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
  {
    title: "Wind rose, one harbour year",
    setup:
      "Sixteen compass sectors. Radius is hours the wind sat in that sector. This is the same PolarArea as the trauma clock, pointed at a compass.",
    read: "The south-west arm is the prevailing weather. The north-east notch is the headland. A ranking bar would hide that this is a direction, not a league table.",
    source: "Harbour anemometer, 2024. Hours per 22.5° sector.",
    chart: (
      <PolarArea
        density="figure"
        aspect={1.15}
        title="Wind hours by sector"
        items={[
          { label: "N", value: 280 },
          { label: "NNE", value: 190 },
          { label: "NE", value: 140 },
          { label: "ENE", value: 210 },
          { label: "E", value: 320 },
          { label: "ESE", value: 410 },
          { label: "SE", value: 520 },
          { label: "SSE", value: 610 },
          { label: "S", value: 740 },
          { label: "SSW", value: 890 },
          { label: "SW", value: 980 },
          { label: "WSW", value: 760 },
          { label: "W", value: 540 },
          { label: "WNW", value: 360 },
          { label: "NW", value: 290 },
          { label: "NNW", value: 250 },
        ]}
      />
    ),
  },
];
