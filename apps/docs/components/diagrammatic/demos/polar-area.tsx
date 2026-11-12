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
      "A Nightingale rose for a city hospital: twenty-four hours around the clock, sector area as volume. The form shows a daily cycle.",
    read: "Arrivals reach 52 at 15h and peak at 61 at 16h, then fall to 48 at 17h. The lowest count is 8 at 04h. The tooltip gives the count behind each sector's area.",
    source: "ED trauma desk, 2024. n = 639 arrivals.",
    chart: (
      <FigTooltip
        labels={HOURS.map((row) => `${row.label}h`)}
        series={{ arrivals: HOURS.map((row) => row.value) }}
      >
        <PolarArea
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
      "Sixteen compass sectors. Sector area represents measured hours of wind from each direction. This is the same PolarArea as the trauma clock, pointed at a compass.",
    read: "SW is the largest sector at 980 hours, followed by SSW at 890. NE is the smallest at 140 hours. Adjacent sectors show the broad south-west concentration.",
    source: "Harbour anemometer, 2024. Hours per 22.5° sector.",
    chart: (
      <PolarArea
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
  {
    title: "Monthly revenue as radial columns",
    setup:
      "A subscription business lays twelve months around a ring. `inner` opens the center so the year reads as columns standing on a circle, and sector area still carries revenue.",
    read: "Revenue climbs from $18m in January to a $41m peak in November, with a summer dip to $22m in July. The open center keeps the small winter months readable.",
    source: "Illustrative monthly revenue, millions of dollars.",
    chart: (
      <PolarArea
        aspect={1.15}
        inner={0.45}
        title="Monthly revenue"
        items={[
          { label: "Jan", value: 18 },
          { label: "Feb", value: 21 },
          { label: "Mar", value: 26 },
          { label: "Apr", value: 29 },
          { label: "May", value: 31 },
          { label: "Jun", value: 27 },
          { label: "Jul", value: 22 },
          { label: "Aug", value: 25 },
          { label: "Sep", value: 32 },
          { label: "Oct", value: 37 },
          { label: "Nov", value: 41 },
          { label: "Dec", value: 35 },
        ]}
      />
    ),
  },
];
