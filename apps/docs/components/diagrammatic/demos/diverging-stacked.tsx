import { DivergingStacked } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Would recommend, by team",
    setup:
      "The engagement survey's key question, one row per team, agreement growing rightward from a shared spine. Likert data has a home form, and this is it.",
    read: "Sales leans hard right — 72% agree — while support's left tail is the chart's alarm: a third of the team would not recommend working there. The shared spine lets the eye rank four teams' sentiment without reading a single percentage.",
    chart: (
      <AppCard title="Would recommend, by team" meta="survey">
        <FigTooltip
          labels={["eng", "design", "sales", "support"]}
          series={{
            "strong no": [8, 14, 4, 22],
            no: [16, 24, 10, 30],
            neutral: [18, 22, 14, 20],
            yes: [34, 26, 40, 18],
            "strong yes": [24, 14, 32, 10],
          }}
          unit="%"
        >
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
        </FigTooltip>
      </AppCard>
    ),
  },
];
