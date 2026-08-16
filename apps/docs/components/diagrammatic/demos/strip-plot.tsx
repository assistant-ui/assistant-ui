import { StripPlot } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
  <StripPlot
    title="Test durations by suite"
    rows={[
      {
        label: "unit",
        values: [0.4, 0.6, 0.7, 0.9, 1, 1.1, 1.4, 1.8, 2.4],
      },
      { label: "int", values: [1.2, 1.6, 1.9, 2.2, 2.5, 2.8, 3.2, 3.8] },
      { label: "e2e", values: [2.4, 3, 3.4, 3.9, 4.3, 4.8, 5.4, 6] },
    ]}
    labels={["0s", "2s", "4s", "6s"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Delivery times by courier",
    setup:
      "An ops lead trials three couriers for a month and plots every delivery as a dot per row, because the contract decision deserves distributions, not SLAs quoted from sales decks.",
    read: "Swift and arrow overlap almost entirely — pick on price. Budget's strip stretches past 110 minutes with a tail that has a habit of losing afternoons; its cheap median is real, and so is the risk sitting to its right.",
    chart: (
      <Report
        title="Delivery times by courier"
        chip="30 days"
        note="Every delivery in the trial month; one dot per drop."
      >
        <StripPlot
          title="Delivery times by courier"
          rows={[
            { label: "swift", values: [22, 26, 28, 31, 33, 36, 40, 44, 48] },
            { label: "arrow", values: [24, 28, 32, 35, 38, 42, 46, 52] },
            { label: "budget", values: [30, 38, 45, 55, 68, 82, 95, 110] },
          ]}
          labels={["0", "40", "80", "120 min"]}
        />
      </Report>
    ),
  },
];
