import { Dumbbell } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report } from "./scenes";

export const glyph = (
  <Dumbbell
    title="Page load score, before and after"
    items={[
      { label: "home", from: 38, to: 84 },
      { label: "search", from: 52, to: 76 },
      { label: "checkout", from: 66, to: 58 },
      { label: "profile", from: 30, to: 54 },
      { label: "api docs", from: 44, to: 92 },
    ]}
    fromLabel="before"
    toLabel="after"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Page load score, before and after",
    setup:
      "A performance sprint ends, and the report shows each page's score as a barbell: the pale dot is before, the dark dot after, the bar between them is the work.",
    read: "Api docs jumped 48 points and home 46 — the wins the sprint will be remembered for. Checkout is the bar that points the wrong way: it regressed mid-sprint and hid inside the team's average until this chart refused to average.",
    chart: (
      <Report
        title="Page scores, before / after"
        chip="sprint"
        note="Lighthouse performance scores before and after the sprint."
      >
        <Dumbbell
          title="Page load score, before and after"
          items={[
            { label: "home", from: 38, to: 84 },
            { label: "search", from: 52, to: 76 },
            { label: "checkout", from: 66, to: 58 },
            { label: "profile", from: 30, to: 54 },
            { label: "api docs", from: 44, to: 92 },
          ]}
          fromLabel="before"
          toLabel="after"
        />
      </Report>
    ),
  },
  {
    title: "Median rent, 2019 against 2025",
    setup:
      "A housing reporter compares five cities' median rents across six years, each city one barbell, so the story is the length of the bar and not just its endpoint.",
    read: "Every city moved right, but the barbell lengths are the story: Miami stretched $950 while Detroit crept $180. 'Rents went up everywhere' is true and useless; the bars say where a lease survived the six years and where it did not.",
    chart: (
      <Paper
        kicker="Housing"
        title="Six years of rent"
        source="Source: listings index"
      >
        <Dumbbell
          title="Median rent by city"
          items={[
            { label: "austin", from: 1350, to: 1780 },
            { label: "miami", from: 1500, to: 2450 },
            { label: "phoenix", from: 1100, to: 1620 },
            { label: "chicago", from: 1650, to: 1890 },
            { label: "detroit", from: 900, to: 1080 },
          ]}
          fromLabel="2019"
          toLabel="2025"
        />
      </Paper>
    ),
  },
  {
    title: "Blood pressure after twelve weeks",
    setup:
      "A clinic trials a lifestyle program on five patients and reports each one's systolic pressure at week zero and week twelve — individual barbells, because averages hide non-responders.",
    read: "Four patients improve by twenty-plus points; patient 04's barbell has no length at all. The program works and works well — for the people it works on. The zero-length bar is the honest finding a mean of −21 would have erased.",
    chart: (
      <AppCard title="BP by patient" meta="week 0 → 12">
        <Dumbbell
          title="Systolic BP by patient"
          items={[
            { label: "pt 01", from: 158, to: 132 },
            { label: "pt 02", from: 149, to: 128 },
            { label: "pt 03", from: 165, to: 141 },
            { label: "pt 04", from: 143, to: 143 },
            { label: "pt 05", from: 152, to: 126 },
          ]}
          fromLabel="week 0"
          toLabel="week 12"
        />
      </AppCard>
    ),
  },
];
