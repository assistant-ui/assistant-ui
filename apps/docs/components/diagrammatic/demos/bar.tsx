import { Bar, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Weekly npm downloads across frameworks",
    setup:
      "A tech lead is asked, again, whether the team bet on the right framework, and pulls one week of npm downloads for the shortlist. Horizontal bars, ranked, values at the end.",
    read: "The gap between first and second is the chart: react's bar is double vue's and everything else shares the leftovers. Whatever the benchmarks say, the ecosystem gravity is not close.",
    chart: (
      <Bar
        title="Weekly npm downloads"
        items={[
          { label: "react", value: 25_000_000 },
          { label: "vue", value: 12_000_000 },
          { label: "svelte", value: 6_200_000 },
          { label: "solid", value: 2_100_000 },
          { label: "qwik", value: 900_000 },
        ]}
      />
    ),
  },
  {
    title: "Catalog size by streaming service",
    setup:
      "A cord-cutting guide compares what each subscription actually contains. Titles in the library, one bar per service — the number the marketing pages bury.",
    read: "Prime's catalog dwarfs the field and Apple's barely registers, yet both charge similar money — the bars say catalog size and price have divorced. Ranked bars with end labels beat a table here because the ratios are the story.",
    chart: (
      <Bar
        title="Catalog size"
        items={[
          { label: "prime", value: 26_000 },
          { label: "netflix", value: 16_000 },
          { label: "max", value: 9_400 },
          { label: "disney+", value: 7_200 },
          { label: "apple", value: 1_100 },
        ]}
        format={(v) => formatCompact(v)}
      />
    ),
  },
  {
    title: "Protein per hundred grams",
    setup:
      "A nutrition coach settles the same client argument every January with one chart: everyday foods on one protein scale, per hundred grams, no serving-size tricks.",
    read: "Lentils sit closer to chicken than most people guess, and yogurt beats tofu — the two usual surprises. Eggs' modest bar is the reminder that per-100g and per-serving are different arguments; the chart picks one and says so in the title.",
    chart: (
      <Bar
        title="Protein per 100g"
        items={[
          { label: "chicken", value: 31 },
          { label: "lentils", value: 25 },
          { label: "eggs", value: 13 },
          { label: "yogurt", value: 10 },
          { label: "tofu", value: 8 },
        ]}
        format={(v) => `${v}g`}
      />
    ),
  },
];
