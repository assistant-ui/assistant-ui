import { Dumbbell } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Page load score, before and after",
    note: "Each bar is a journey; checkout is the one that quietly regressed.",
    chart: (
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
    ),
  },
  {
    title: "Median rent, 2019 against 2025",
    note: "Every city moved right; the length of each barbell is the housing story.",
    chart: (
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
    ),
  },
  {
    title: "Blood pressure after twelve weeks",
    note: "Four patients improve, one holds; the gap is the treatment effect per person.",
    chart: (
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
    ),
  },
];
