import { DivergingStacked } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Would recommend, by team",
    setup:
      "The engagement survey's key question, one row per team, agreement growing rightward from a shared spine. Likert data has a home form, and this is it.",
    read: "Sales leans hard right — 72% agree — while support's left tail is the chart's alarm: a third of the team would not recommend working there. The shared spine lets the eye rank four teams' sentiment without reading a single percentage.",
    chart: (
      <DivergingStacked
        title="Would recommend, by team"
        rows={[
          { label: "eng", values: [8, 16, 18, 34, 24] },
          { label: "design", values: [14, 24, 22, 26, 14] },
          { label: "sales", values: [4, 10, 14, 40, 32] },
          { label: "support", values: [22, 30, 20, 18, 10] },
        ]}
        endLabels={["disagree", "agree"]}
      />
    ),
  },
  {
    title: "Beta feedback on four features",
    setup:
      "A beta wrap-up scores each shipped feature on a five-point love-hate scale. The product decision is which features graduate, and the rows are the evidence.",
    read: "Dark mode has essentially no critics — ship it. The ai draft splits the room symmetrically, which is a positioning problem, not a quality one. New nav's left-heavy row is the graveyard shape, and it reads as such from across the room.",
    chart: (
      <DivergingStacked
        title="Feature reception"
        rows={[
          { label: "dark mode", values: [1, 4, 10, 35, 50] },
          { label: "search", values: [6, 12, 20, 38, 24] },
          { label: "ai draft", values: [18, 20, 18, 26, 18] },
          { label: "new nav", values: [24, 28, 22, 18, 8] },
        ]}
        endLabels={["hate it", "love it"]}
      />
    ),
  },
  {
    title: "Return-to-office sentiment by cohort",
    setup:
      "An HR survey splits the return-to-office question by generation, because the leadership team suspects the disagreement is generational and needs to see it.",
    read: "Every cohort leans against, but the lean deepens with each younger row — gen z's against-block is nearly triple its for-block. The policy question stops being 'if people mind' and becomes 'which decade of hires you mind losing'.",
    chart: (
      <DivergingStacked
        title="RTO sentiment by cohort"
        rows={[
          { label: "boomer", values: [12, 18, 26, 28, 16] },
          { label: "gen x", values: [18, 24, 24, 22, 12] },
          { label: "millennial", values: [26, 30, 20, 16, 8] },
          { label: "gen z", values: [34, 30, 18, 12, 6] },
        ]}
        endLabels={["against", "for"]}
      />
    ),
  },
];
