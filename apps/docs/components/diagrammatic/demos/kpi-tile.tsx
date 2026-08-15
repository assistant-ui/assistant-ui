import { KpiTile } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Active runs, with trend",
    setup:
      "The first tile on an ops dashboard: the headline number, its delta, and eight periods of context in one card. Every dashboard's opening sentence looks like this.",
    read: "1,284 active runs, up 12.4%, and the sparkline shows the climb is recent — the last three periods did the work. Number answers 'what', delta answers 'versus when', trend answers 'should I believe it'; a KPI tile is those three answers stapled together.",
    chart: (
      <KpiTile
        label="active runs"
        value="1,284"
        delta={{ value: "12.4%", direction: "up" }}
        trend={[30, 42, 38, 52, 48, 62, 70, 84]}
      />
    ),
  },
  {
    title: "Monthly recurring revenue, slipping",
    setup:
      "A founder's phone widget shows one tile: MRR. This month it turned red for the first time since launch.",
    read: "The down arrow does the talking, but the sparkline does the diagnosing: the slide started two periods ago and the delta only just caught up. Tiles with trends catch problems one board meeting earlier than tiles without.",
    chart: (
      <KpiTile
        label="mrr"
        value="$48.2k"
        delta={{ value: "3.1%", direction: "down" }}
        trend={[52, 54, 55, 56, 54, 53, 51, 50]}
      />
    ),
  },
  {
    title: "Net promoter score, recovering",
    setup:
      "A support team's quarterly tile after two rough quarters and a rebuilt onboarding flow. The whole turnaround argument is this one card.",
    read: "A KPI tile is a sentence: NPS is 41, up six points, and here is the shape of the comeback — down to 26, then four straight periods of climb. The trend line turns a good delta into a credible trajectory.",
    chart: (
      <KpiTile
        label="nps"
        value="41"
        delta={{ value: "6pts", direction: "up" }}
        trend={[38, 34, 29, 26, 30, 33, 37, 41]}
      />
    ),
  },
];
