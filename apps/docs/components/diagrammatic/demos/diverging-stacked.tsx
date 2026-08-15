import { DivergingStacked } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Would recommend, by team",
    note: "Agreement grows rightward from a shared spine; support's left tail is the finding.",
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
    note: "Two features are loved, one splits the room, and dark mode has no critics at all.",
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
    note: "Every cohort leans against, but the lean deepens with each younger row.",
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
