import { StripPlot } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Test durations by suite",
    setup:
      "A CI dashboard shows raw test durations as dots on shared rows — no bars, no averages — because the team is hunting stragglers, not summarizing.",
    read: "The e2e strip starts where unit tests end; the suites barely overlap, which is the pyramid working as intended. The rightmost unit dot at 2.4s is the one to bisect — a unit test moonlighting as an integration test.",
    chart: (
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
    ),
  },
  {
    title: "Bottle prices by shelf",
    setup:
      "A wine shop owner checks whether the three shelves — budget, mid, reserve — actually occupy distinct price bands, or whether the labels are theater.",
    read: "The bands barely touch: the reserve shelf's cheapest bottle costs more than the budget shelf's dearest. The empty gap between mid and reserve is the $36-to-$42 no-man's-land where nothing sells, and the pricing strategy is visibly deliberate.",
    chart: (
      <StripPlot
        title="Wine prices by shelf"
        rows={[
          { label: "budget", values: [8, 9, 10, 11, 12, 13, 14, 15, 17] },
          { label: "mid", values: [18, 20, 22, 24, 26, 29, 32, 36] },
          { label: "reserve", values: [42, 48, 55, 62, 70, 85, 95] },
        ]}
        labels={["$0", "$30", "$60", "$90"]}
      />
    ),
  },
  {
    title: "Delivery times by courier",
    setup:
      "An ops lead trials three couriers for a month and plots every delivery as a dot per row, because the contract decision deserves distributions, not SLAs quoted from sales decks.",
    read: "Swift and arrow overlap almost entirely — pick on price. Budget's strip stretches past 110 minutes with a tail that has a habit of losing afternoons; its cheap median is real, and so is the risk sitting to its right.",
    chart: (
      <StripPlot
        title="Delivery times by courier"
        rows={[
          { label: "swift", values: [22, 26, 28, 31, 33, 36, 40, 44, 48] },
          { label: "arrow", values: [24, 28, 32, 35, 38, 42, 46, 52] },
          { label: "budget", values: [30, 38, 45, 55, 68, 82, 95, 110] },
        ]}
        labels={["0", "40", "80", "120 min"]}
      />
    ),
  },
];
