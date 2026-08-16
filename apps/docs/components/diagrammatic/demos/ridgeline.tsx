import { Ridgeline } from "diagrammatic";
import type { DemoExample } from "./types";

const MONTHS = [
  { label: "Jan", bins: [2, 8, 18, 28, 22, 12, 6, 3, 1, 0.4, 0.2, 0.1] },
  { label: "Feb", bins: [1, 5, 14, 26, 28, 16, 7, 3, 1, 0.4, 0.2, 0.1] },
  { label: "Mar", bins: [0.4, 2, 8, 18, 28, 24, 12, 5, 2, 0.6, 0.2, 0.1] },
  { label: "Apr", bins: [0.2, 0.6, 3, 10, 22, 30, 20, 9, 3, 1, 0.3, 0.1] },
  { label: "May", bins: [0.1, 0.3, 1, 4, 12, 26, 30, 16, 7, 2, 0.6, 0.2] },
  { label: "Jun", bins: [0.1, 0.2, 0.4, 2, 6, 16, 28, 26, 14, 5, 1.4, 0.4] },
  { label: "Jul", bins: [0.1, 0.1, 0.2, 0.8, 3, 10, 22, 30, 20, 9, 3, 1] },
  { label: "Aug", bins: [0.1, 0.1, 0.2, 0.6, 2, 8, 20, 30, 22, 10, 4, 1.2] },
  { label: "Sep", bins: [0.1, 0.2, 0.6, 2, 8, 18, 28, 24, 12, 5, 1.6, 0.4] },
  { label: "Oct", bins: [0.2, 0.6, 2, 8, 18, 28, 24, 12, 5, 1.6, 0.5, 0.2] },
  { label: "Nov", bins: [0.6, 2, 8, 18, 28, 22, 12, 5, 2, 0.6, 0.2, 0.1] },
  { label: "Dec", bins: [1.4, 6, 16, 26, 24, 14, 7, 3, 1.2, 0.4, 0.2, 0.1] },
];

export const glyph = (
  <Ridgeline
    title="Daily highs"
    rows={MONTHS.slice(0, 5)}
    highlight="Mar"
    labels={["8°", "16°", "24°"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "San Francisco daily highs, 2024",
    setup:
      "Twelve ridges, one year. Each row is a month of daily maximums on a shared temperature axis. The drift is the picture.",
    read: "March is the first month the mass clears the marine layer's 16° band. July and August sit on top of each other; there is no true summer spike. December returns almost to January. Order the rows any other way and the year disappears.",
    source: "NOAA daily Tmax, San Francisco Downtown, 2024.",
    chart: (
      <Ridgeline
        density="figure"
        aspect={1.35}
        title="Daily highs, San Francisco 2024"
        rows={MONTHS}
        highlight="Mar"
        labels={["8°", "14°", "20°", "26°"]}
      />
    ),
  },
];
