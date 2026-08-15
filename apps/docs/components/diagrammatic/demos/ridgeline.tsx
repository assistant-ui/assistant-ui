import { Ridgeline } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Daily temperatures, month by month",
    note: "Each ridge is a month's distribution; the drift to the right is spring arriving.",
    chart: (
      <Ridgeline
        title="Daily temperatures, month by month"
        rows={["Jan", "Feb", "Mar", "Apr", "May"].map((label, month) => ({
          label,
          bins: Array.from({ length: 10 }, (_, bin) =>
            Math.max(0.5, Math.sin(((bin - month) / 9) * Math.PI) * 40),
          ),
        }))}
        highlight="Mar"
        labels={["-10°", "0°", "10°", "20°"]}
      />
    ),
  },
  {
    title: "Listening hours through the day, Monday to Friday",
    note: "The evening peak slides later as the week wears on; Friday's ridge barely sleeps.",
    chart: (
      <Ridgeline
        title="Listening by hour"
        rows={[
          { label: "Mon", bins: [8, 20, 6, 4, 10, 18, 30, 22, 8, 3] },
          { label: "Tue", bins: [7, 18, 6, 4, 11, 19, 32, 25, 10, 4] },
          { label: "Wed", bins: [7, 17, 6, 5, 12, 20, 30, 28, 12, 5] },
          { label: "Thu", bins: [6, 16, 6, 5, 12, 21, 28, 32, 16, 7] },
          { label: "Fri", bins: [6, 14, 5, 5, 11, 18, 24, 34, 26, 14] },
        ]}
        highlight="Fri"
        labels={["6am", "noon", "6pm", "12am"]}
      />
    ),
  },
  {
    title: "Wait times across five clinics",
    note: "Four clinics share a shape; the downtown ridge has a second hump after lunch.",
    chart: (
      <Ridgeline
        title="Clinic wait times"
        rows={[
          { label: "north", bins: [12, 30, 42, 34, 18, 8, 4, 2, 1, 0.5] },
          { label: "east", bins: [10, 26, 40, 36, 22, 10, 5, 2, 1, 0.5] },
          { label: "south", bins: [8, 22, 38, 40, 24, 12, 6, 3, 1, 0.5] },
          { label: "west", bins: [11, 28, 44, 32, 16, 7, 3, 1.5, 1, 0.5] },
          { label: "downtown", bins: [6, 18, 30, 22, 14, 18, 26, 18, 8, 3] },
        ]}
        highlight="downtown"
        labels={["0", "20", "40", "60 min"]}
      />
    ),
  },
];
