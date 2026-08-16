import { Bullet } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <div className="mx-auto flex w-full max-w-96 flex-col gap-4">
    <Bullet value={128} target={140} bands={[60, 110, 160]} label="rev" />
    <Bullet value={104} target={90} bands={[50, 95, 160]} label="nps" />
  </div>
);

export const examples: DemoExample[] = [
  {
    title: "Revenue and NPS against target",
    setup:
      "An executive dashboard gives each KPI one slim row: qualitative bands for context, a tick for the target, a bar for the truth. Stephen Few designed this form to replace dashboard gauges, and it still does that job.",
    read: "Revenue's bar stops short of its tick inside the 'good' band — behind target, but not badly. NPS clears its tick entirely. Two verdicts in two glances, no needles, no dials, no wasted circle.",
    chart: (
      <AppCard title="KPIs vs target" meta="exec view">
        <div className="mx-auto flex w-full max-w-96 flex-col gap-4">
          <Bullet value={128} target={140} bands={[60, 110, 160]} label="rev" />
          <Bullet value={104} target={90} bands={[50, 95, 160]} label="nps" />
        </div>
      </AppCard>
    ),
  },
];
