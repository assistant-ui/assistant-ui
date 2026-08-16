import { PolarArea } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Terminal } from "./scenes";

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
      </Paper>
    ),
  },
  {
    title: "Emergency calls by three-hour block",
    setup:
      "A dispatch center justifies its shift plan with one chart: call volume by three-hour block, wrapped on a 24-hour circle, because the day repeats and the chart should too.",
    read: "The evening wedge at 18h is triple the 3am sliver — the night shift is quiet in exactly the way the staffing model assumes. Wrapping time on a circle puts 23:59 next to 00:00, which a bar chart quietly gets wrong.",
    chart: (
      <Terminal title="dispatch calls — by block">
        <PolarArea
          title="Calls by time of day"
          items={[
            { label: "00", value: 22 },
            { label: "03", value: 12 },
            { label: "06", value: 18 },
            { label: "09", value: 42 },
            { label: "12", value: 55 },
            { label: "15", value: 61 },
            { label: "18", value: 84 },
            { label: "21", value: 48 },
          ]}
        />
      </Terminal>
    ),
  },
  {
    title: "Gym check-ins by weekday",
    setup:
      "A gym owner plots check-ins by weekday on a circle because the week is a cycle and the Monday cliff-edge against Sunday is part of the story.",
    read: "Monday resolution, weekend collapse: the wedges shrink monotonically from Monday's peak to Sunday's sliver, then snap back where the circle closes. That discontinuity — Sunday touching Monday — is the member psychology in one seam.",
    chart: (
      <AppCard title="Check-ins by weekday" meta="gym">
        <PolarArea
          title="Check-ins by weekday"
          items={[
            { label: "Mon", value: 96 },
            { label: "Tue", value: 84 },
            { label: "Wed", value: 78 },
            { label: "Thu", value: 70 },
            { label: "Fri", value: 52 },
            { label: "Sat", value: 38 },
            { label: "Sun", value: 30 },
          ]}
        />
      </AppCard>
    ),
  },
];
