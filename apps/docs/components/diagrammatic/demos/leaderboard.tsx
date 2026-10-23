import { Leaderboard } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Leaderboard
    title="Top referrers by visits"
    items={[
      { label: "search portal", value: 9_600 },
      { label: "code host", value: 7_800 },
      { label: "social feed", value: 6_300 },
      { label: "forum", value: 4_100 },
      { label: "dev digest", value: 2_800 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Top referrers, last 28 days",
    setup:
      "Where readers arrive from. Each row shows a name, sessions, and a quiet bar. Other groups the smaller sources.",
    read: "The search portal has 18.4k sessions, more than the code host and social feed together. The four named rows below Other total 4,050, less than the forum's 4,800.",
    source: "Sessions, last 28 days. Direct and unattributed omitted.",
    chart: (
      <FigTooltip
        labels={[
          "search portal",
          "code host",
          "social feed",
          "forum",
          "dev digest",
          "other",
          "changelog",
          "video hub",
          "career network",
          "web search",
        ]}
        series={{
          sessions: [
            "18.4k",
            "9.1k",
            "6.6k",
            "4.8k",
            "3.2k",
            "2.4k",
            "1.9k",
            "1.1k",
            "640",
            "410",
          ],
        }}
      >
        <Leaderboard
          aspect={1.15}
          title="Top referrers"
          items={[
            { label: "search portal", value: 18_400 },
            { label: "code host", value: 9_100 },
            { label: "social feed", value: 6_600 },
            { label: "forum", value: 4_800 },
            { label: "dev digest", value: 3_200 },
            { label: "other", value: 2_400 },
            { label: "changelog", value: 1_900 },
            { label: "video hub", value: 1_100 },
            { label: "career network", value: 640 },
            { label: "web search", value: 410 },
          ]}
        />
      </FigTooltip>
    ),
  },
];
