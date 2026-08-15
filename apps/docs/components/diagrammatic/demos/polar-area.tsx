import { PolarArea } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Wind hours by direction",
    note: "The rose points where the wind comes from; north and east own this coastline.",
    chart: (
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
    ),
  },
  {
    title: "Emergency calls by three-hour block",
    note: "The night wedges shrink to slivers; the evening block is when the phones ring.",
    chart: (
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
    ),
  },
  {
    title: "Gym check-ins by weekday",
    note: "Monday resolution, weekend collapse; a cycle reads better on a circle.",
    chart: (
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
    ),
  },
];
