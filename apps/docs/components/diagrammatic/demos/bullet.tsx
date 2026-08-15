import { Bullet } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Revenue and NPS against target",
    setup:
      "An executive dashboard gives each KPI one slim row: qualitative bands for context, a tick for the target, a bar for the truth. Stephen Few designed this form to replace dashboard gauges, and it still does that job.",
    read: "Revenue's bar stops short of its tick inside the 'good' band — behind target, but not badly. NPS clears its tick entirely. Two verdicts in two glances, no needles, no dials, no wasted circle.",
    chart: (
      <div className="mx-auto flex w-full max-w-80 flex-col gap-2">
        <Bullet value={128} target={140} bands={[60, 110, 160]} label="rev" />
        <Bullet value={104} target={90} bands={[50, 95, 160]} label="nps" />
      </div>
    ),
  },
  {
    title: "Sprint commitments, mid-sprint",
    setup:
      "A sprint dashboard tracks points done against committed, and bugs against the team's tolerance ceiling — same form, opposite polarities, labeled so nobody misreads which is which.",
    read: "Points sit at 34 against a 42 commitment with three days left: tight but plausible. The bugs bar has already passed its tick — 11 against a ceiling of 8 — and that overshoot, not the points, is what tomorrow's standup is about.",
    chart: (
      <div className="mx-auto flex w-full max-w-80 flex-col gap-2">
        <Bullet value={34} target={42} bands={[20, 36, 52]} label="pts" />
        <Bullet value={11} target={8} bands={[4, 9, 14]} label="bugs" />
      </div>
    ),
  },
  {
    title: "A day of health goals",
    setup:
      "A health app's evening summary: two goals, one glance, bands marking what counts as a poor, fine, or great day.",
    read: "Water is behind schedule at 1.4 of 2.5 liters — the evening's actionable item — while sleep banked a surplus past its tick. The bullet's gift is exactly this asymmetry: one row nags, the other congratulates, both in fifteen pixels of height.",
    chart: (
      <div className="mx-auto flex w-full max-w-80 flex-col gap-2">
        <Bullet value={1.4} target={2.5} bands={[1, 2, 3]} label="water" />
        <Bullet value={7.8} target={7} bands={[5, 6.5, 9]} label="sleep" />
      </div>
    ),
  },
];
