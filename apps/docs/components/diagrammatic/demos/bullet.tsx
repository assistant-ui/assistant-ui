import { Bullet } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Revenue and NPS against target",
    note: "Bands for context, a tick for the target, a bar for the truth.",
    chart: (
      <div className="mx-auto flex w-full max-w-80 flex-col gap-2">
        <Bullet value={128} target={140} bands={[60, 110, 160]} label="rev" />
        <Bullet value={104} target={90} bands={[50, 95, 160]} label="nps" />
      </div>
    ),
  },
  {
    title: "Sprint commitments, mid-sprint",
    note: "Points done against committed; the tick is the promise, the bands are history.",
    chart: (
      <div className="mx-auto flex w-full max-w-80 flex-col gap-2">
        <Bullet value={34} target={42} bands={[20, 36, 52]} label="pts" />
        <Bullet value={11} target={8} bands={[4, 9, 14]} label="bugs" />
      </div>
    ),
  },
  {
    title: "A day of health goals",
    note: "Two goals, one glance: water is behind schedule, sleep banked a surplus.",
    chart: (
      <div className="mx-auto flex w-full max-w-80 flex-col gap-2">
        <Bullet value={1.4} target={2.5} bands={[1, 2, 3]} label="water" />
        <Bullet value={7.8} target={7} bands={[5, 6.5, 9]} label="sleep" />
      </div>
    ),
  },
];
