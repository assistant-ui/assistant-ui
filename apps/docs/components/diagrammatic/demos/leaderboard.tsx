import { Leaderboard } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
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
    read: "Google alone matches the next two rows combined, and below fifth place the bars collapse into the long tail — four sources that together move less traffic than hn alone. The bars keep the ratios honest while the numbers stay quotable — neither a table nor a chart could do both alone.",
    chart: (
      <AppCard title="Top referrers" meta="visits">
        <FigTooltip
          labels={[
            "google",
            "github",
            "x.com",
            "reddit",
            "hn",
            "youtube",
            "linkedin",
            "bing",
            "ddg",
          ]}
          series={{
            visits: [
              "14.8k",
              "8.2k",
              "6.1k",
              "4.1k",
              "2.9k",
              "1.4k",
              "620",
              "480",
              "260",
            ],
          }}
        >
          <Leaderboard
            title="Top referrers by visits"
            items={[
              { label: "google", value: 14_800 },
              { label: "github", value: 8_200 },
              { label: "x.com", value: 6_100 },
              { label: "reddit", value: 4_100 },
              { label: "hn", value: 2_900 },
              { label: "youtube", value: 1_400 },
              { label: "linkedin", value: 620 },
              { label: "bing", value: 480 },
              { label: "ddg", value: 260 },
            ]}
          />
        </FigTooltip>
      </AppCard>
    ),
  },
];
