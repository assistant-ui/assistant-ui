import { Lollipop } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report } from "./scenes";

export const glyph = (
  <Lollipop
    title="Satisfaction score by team"
    items={[
      { label: "support", value: 58 },
      { label: "sales", value: 84 },
      { label: "eng", value: 40 },
      { label: "ops", value: 66 },
      { label: "design", value: 92 },
      { label: "hr", value: 48 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Satisfaction score by team",
    setup:
      "An HR partner presents survey scores by team to a room that has seen a thousand bar charts. The lollipop is a bar on a diet: the dot carries the value, the stem carries the eye.",
    read: "Design and sales sit above 80 while engineering languishes at 40 — a fifty-point spread inside one company. With six close-ish values, heavy bars would shout; the thin stems let the outlier do the talking.",
    chart: (
      <AppCard title="Satisfaction by team" meta="survey">
        <Lollipop
          title="Satisfaction score by team"
          items={[
            { label: "support", value: 58 },
            { label: "sales", value: 84 },
            { label: "eng", value: 40 },
            { label: "ops", value: 66 },
            { label: "design", value: 92 },
            { label: "hr", value: 48 },
          ]}
        />
      </AppCard>
    ),
  },
  {
    title: "Caffeine per serving",
    setup:
      "A health page ranks common drinks by caffeine per serving, because the folk ranking is confidently wrong and the correction deserves a clean chart.",
    read: "Espresso's reputation outruns its milligrams: the drip mug nearly triples it. Even the energy drink loses to plain filter coffee. The dots make the exact values quotable, which is what a myth-busting chart needs.",
    chart: (
      <Paper
        kicker="Health"
        title="Caffeine, honestly"
        source="Source: beverage lab assays"
      >
        <Lollipop
          title="Caffeine per serving"
          items={[
            { label: "drip", value: 145 },
            { label: "energy", value: 110 },
            { label: "espresso", value: 63 },
            { label: "black tea", value: 47 },
            { label: "cola", value: 34 },
            { label: "cocoa", value: 12 },
          ]}
          format={(v) => `${v}mg`}
        />
      </Paper>
    ),
  },
  {
    title: "Average one-way commute by city",
    setup:
      "A relocation guide compares commute minutes across the cities on a reader's shortlist. Six values on one scale, precise enough to do arithmetic with.",
    read: "Tokyo to Austin is a twenty-minute gap each way — three and a half hours a week, a hundred and seventy hours a year. Lisbon and Austin effectively tie, so between those two the commute stops being a deciding factor at all.",
    chart: (
      <Report title="Commute minutes" chip="6 cities">
        <Lollipop
          title="Commute minutes by city"
          items={[
            { label: "tokyo", value: 48 },
            { label: "london", value: 41 },
            { label: "nyc", value: 38 },
            { label: "berlin", value: 32 },
            { label: "lisbon", value: 28 },
            { label: "austin", value: 27 },
          ]}
          format={(v) => `${v} min`}
        />
      </Report>
    ),
  },
];
