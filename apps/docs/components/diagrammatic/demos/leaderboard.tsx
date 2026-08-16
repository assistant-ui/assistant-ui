import { Leaderboard } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

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
    title: "Top referrers, last 28 days",
    setup:
      "The docs site answers where readers arrive from. Rank, name, sessions, and a quiet bar in one row. Anything past the tenth line is Other.",
    read: "Google is still half of github plus x. The surprise is changelog.assistant-ui.com in sixth: the release notes now outrun YouTube. Below hn the bars collapse; those four rows together do not match reddit.",
    source: "Sessions, last 28 days. Direct and unattributed omitted.",
    chart: (
      <FigTooltip
        labels={[
          "google",
          "github",
          "x.com",
          "reddit",
          "news.ycombinator.com",
          "changelog",
          "youtube",
          "linkedin",
          "bing",
          "other",
        ]}
        series={{
          sessions: [
            "18.4k",
            "9.1k",
            "6.6k",
            "4.8k",
            "3.2k",
            "1.9k",
            "1.1k",
            "640",
            "410",
            "2.4k",
          ],
        }}
      >
        <Leaderboard
          density="figure"
          aspect={1.15}
          title="Top referrers"
          items={[
            { label: "google", value: 18_400 },
            { label: "github", value: 9_100 },
            { label: "x.com", value: 6_600 },
            { label: "reddit", value: 4_800 },
            { label: "news.ycombinator.com", value: 3_200 },
            { label: "changelog", value: 1_900 },
            { label: "youtube", value: 1_100 },
            { label: "linkedin", value: 640 },
            { label: "bing", value: 410 },
            { label: "other", value: 2_400 },
          ]}
        />
      </FigTooltip>
    ),
  },
];
