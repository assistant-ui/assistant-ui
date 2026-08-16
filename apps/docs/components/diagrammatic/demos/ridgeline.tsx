import { Ridgeline } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
  <Ridgeline
    title="Daily temperatures, month by month"
    rows={[
      { label: "Jan", bins: [6, 22, 38, 30, 14, 5, 2, 1, 0.5, 0.5] },
      { label: "Feb", bins: [3, 14, 30, 38, 22, 9, 3, 1, 0.5, 0.5] },
      { label: "Mar", bins: [1, 6, 18, 34, 38, 22, 9, 3, 1, 0.5] },
      { label: "Apr", bins: [0.5, 2, 8, 20, 34, 38, 20, 8, 2, 1] },
      { label: "May", bins: [0.5, 1, 3, 10, 22, 36, 38, 18, 6, 2] },
    ]}
    highlight="Mar"
    labels={["-10°", "0°", "10°", "20°"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Daily temperatures, month by month",
    setup:
      "A climate blog shows spring arriving as five stacked distributions: each ridge is one month of daily highs, sharing an axis so the drift is the picture.",
    read: "The ridges march rightward as winter lets go — March, highlighted, is the month the whole curve finally clears freezing. Overlap hides valleys behind peaks, so the months are ordered deliberately; shuffle them and the form falls apart.",
    chart: (
      <Paper
        kicker="Climate"
        title="Spring, arriving"
        source="Source: municipal weather station"
      >
        <Ridgeline
          title="Daily temperatures, month by month"
          rows={[
            { label: "Jan", bins: [6, 22, 38, 30, 14, 5, 2, 1, 0.5, 0.5] },
            { label: "Feb", bins: [3, 14, 30, 38, 22, 9, 3, 1, 0.5, 0.5] },
            { label: "Mar", bins: [1, 6, 18, 34, 38, 22, 9, 3, 1, 0.5] },
            { label: "Apr", bins: [0.5, 2, 8, 20, 34, 38, 20, 8, 2, 1] },
            { label: "May", bins: [0.5, 1, 3, 10, 22, 36, 38, 18, 6, 2] },
          ]}
          highlight="Mar"
          labels={["-10°", "0°", "10°", "20°"]}
        />
      </Paper>
    ),
  },
];
