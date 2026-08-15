import { Leaderboard } from "diagrammatic";

export function LeaderboardDemo() {
  return (
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
}
