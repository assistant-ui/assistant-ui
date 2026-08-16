import { Leaderboard, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Slide, Terminal } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Top referrers by visits",
    setup:
      "An analytics dashboard answers 'where do visitors come from' in the sidebar, where a full chart won't fit. The leaderboard fuses table and bar: rank, name, value, and a quiet gauge in one row each.",
    read: "Google alone matches the next two rows combined, and the drop from fourth to fifth is the long tail announcing itself. The bars keep the ratios honest while the numbers stay quotable — neither a table nor a chart could do both alone.",
    chart: (
      <AppCard title="Top referrers" meta="visits">
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
      </AppCard>
    ),
  },
  {
    title: "Most-streamed artists this week",
    setup:
      "A streaming service's editorial page runs the weekly top five. The design constraint is brutal — phone width, five rows — which is exactly the leaderboard's habitat.",
    read: "First place streams half again as much as second, a gap the bars make visible before the numbers confirm it. Chart position and bar length agree here; the interesting weeks are when a riser's bar crowds the row above.",
    chart: (
      <Slide title="Most-streamed this week" footer="editorial · weekly">
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
      </Slide>
    ),
  },
  {
    title: "Deals closed this quarter",
    setup:
      "A sales floor's TV shows the quarter's closer board, refreshed hourly. It is equal parts dashboard and motivation, which the ranked form serves unashamedly.",
    read: "Two reps carry half the board, and the three-deal gap at the top is what the last week of the quarter is about. Below third place the bars flatten — the coaching conversation lives down there, not at the top.",
    chart: (
      <Terminal title="deals closed — q3">
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
      </Terminal>
    ),
  },
];
