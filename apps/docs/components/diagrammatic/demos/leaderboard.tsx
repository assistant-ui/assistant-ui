import { Leaderboard, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Top referrers by visits",
    note: "Rank, name, value, and a quiet bar; the table and the chart are one object.",
    chart: (
      <Leaderboard
        title="Top referrers by visits"
        items={[
          { label: "google", value: 9_600 },
          { label: "github", value: 7_800 },
          { label: "x.com", value: 6_300 },
          { label: "reddit", value: 4_100 },
          { label: "hn", value: 2_800 },
        ]}
      />
    ),
  },
  {
    title: "Most-streamed artists this week",
    note: "The gap below first place is bigger than the rest of the list combined thinks it is.",
    chart: (
      <Leaderboard
        title="Streams this week"
        items={[
          { label: "houndsong", value: 42_000_000 },
          { label: "vela", value: 28_500_000 },
          { label: "north era", value: 24_100_000 },
          { label: "moth radio", value: 19_800_000 },
          { label: "koi", value: 17_200_000 },
        ]}
        format={(v) => formatCompact(v)}
      />
    ),
  },
  {
    title: "Deals closed this quarter",
    note: "A sales floor at a glance; two reps carry half the board.",
    chart: (
      <Leaderboard
        title="Deals closed"
        items={[
          { label: "priya", value: 34 },
          { label: "marcus", value: 31 },
          { label: "lena", value: 22 },
          { label: "diego", value: 18 },
          { label: "sam", value: 14 },
        ]}
      />
    ),
  },
];
