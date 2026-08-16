import { Leaderboard } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

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
];
