import { Radar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Two models across five capabilities",
    note: "The outlines disagree most on code and vision; overlap is where the benchmark ties.",
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
    note: "The prospect's shape bulges on pace and dribbling and dents on defending; that is a winger.",
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
    note: "One is a workflow, the other a ritual; the radar shows you which one you are buying.",
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
