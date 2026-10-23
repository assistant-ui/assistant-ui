import { Bullet } from "diagrammatic";
import type { DemoExample } from "./types";

export const glyph = (
  <div className="mx-auto flex w-full max-w-96 flex-col gap-4">
    <Bullet value={128} target={140} bands={[60, 110, 160]} label="rev" />
    <Bullet value={94} target={90} bands={[50, 95, 160]} label="nps" />
  </div>
);

export const examples: DemoExample[] = [
  {
    title: "Revenue and NPS against target",
    setup:
      "Two rows. Qualitative bands, a tick for the target, a bar for the truth. The bands are named once under the figure.",
    read: "Revenue stops short of its tick inside good. NPS clears its tick. Two verdicts, no dials.",
    source: "Q2 close. Bands: poor / ok / good.",
    chart: (
      <div className="mx-auto flex w-full max-w-96 flex-col gap-3">
        <Bullet
          value={128}
          target={140}
          bands={[60, 110, 160]}
          label="rev"
          title="Revenue against plan"
        />
        <Bullet
          value={94}
          target={90}
          bands={[50, 95, 160]}
          label="nps"
          title="NPS against plan"
        />
        <p className="text-muted-foreground flex justify-between text-xs">
          <span>poor</span>
          <span>ok</span>
          <span>good</span>
        </p>
      </div>
    ),
  },
];
