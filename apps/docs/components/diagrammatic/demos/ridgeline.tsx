import { Ridgeline } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Daily temperatures, month by month",
    setup:
      "A climate blog shows spring arriving as five stacked distributions: each ridge is one month of daily highs, sharing an axis so the drift is the picture.",
    read: "The ridges march rightward as winter lets go — March, highlighted, is the month the whole curve finally clears freezing. Overlap hides valleys behind peaks, so the months are ordered deliberately; shuffle them and the form falls apart.",
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
    setup:
      "A streaming service profiles when a cohort listens, one ridge per weekday, hunting for the shape shift the recommendations engine should know about.",
    read: "The evening peak slides later as the week wears on, and Friday's ridge barely sleeps — its tail runs past midnight where Monday's has already gone home. Same users, five different days; the stack makes the drift legible in one glance.",
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
    setup:
      "A health network compares waiting-time distributions across its clinics. Averages look fine everywhere, which is exactly why the ridgeline was ordered.",
    read: "Four clinics share one shape; downtown, highlighted, grows a second hump after lunch — a staffing gap at 2pm wearing a distribution costume. One anomalous ridge in a stack of normal ones is this form's favorite kind of finding.",
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
