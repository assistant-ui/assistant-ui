import { Radar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Two models across five capabilities",
    setup:
      "An eval report compares two language models across five benchmark axes, overlaid so their strengths argue in the same frame.",
    read: "The outlines disagree most on code and vision — atlas-1's corners — while nova-2 bulges toward reasoning and writing. The overlap in the middle is where benchmarks tie and marketing departments do not.",
    chart: (
      <Radar
        title="Two models across five capabilities"
        axes={["code", "reason", "write", "vision", "speed"]}
        series={[
          { name: "atlas-1", data: [0.85, 0.7, 0.6, 0.8, 0.75] },
          { name: "nova-2", data: [0.55, 0.85, 0.75, 0.45, 0.6] },
        ]}
      />
    ),
  },
  {
    title: "A scouting profile against the league average",
    setup:
      "A football scout files a report as the radar every recruitment department speaks: the prospect's five attributes drawn over the league-average pentagon.",
    read: "The shape bulges on pace and dribbling and dents hard on defending: that is a winger, stated in geometry before the text says a word. Buying him means buying the dent too, and the overlay prices it against average.",
    chart: (
      <Radar
        title="Prospect against league average"
        axes={["pace", "shot", "pass", "dribble", "defend"]}
        series={[
          { name: "prospect", data: [0.92, 0.66, 0.58, 0.88, 0.3] },
          { name: "league avg", data: [0.6, 0.55, 0.6, 0.55, 0.55] },
        ]}
      />
    ),
  },
  {
    title: "Two espresso machines, five traits",
    setup:
      "A coffee reviewer scores a manual lever machine and a super-automatic across five traits, then overlays them for the buying-guide verdict.",
    read: "One is a ritual, the other a workflow: the lever peaks on taste and quiet, the auto on speed and ease. The shapes barely overlap — the radar shows you which machine you are, not which is better.",
    chart: (
      <Radar
        title="Espresso machines compared"
        axes={["taste", "speed", "ease", "quiet", "price"]}
        series={[
          { name: "lever", data: [0.95, 0.3, 0.25, 0.8, 0.4] },
          { name: "auto", data: [0.65, 0.9, 0.95, 0.5, 0.6] },
        ]}
      />
    ),
  },
];
