"use client";

import { useState } from "react";
import { Line } from "diagrammatic";
import { Root, type MarkDatum } from "diagrammatic/interactive";

const BUILDS = [
  "#4801",
  "#4802",
  "#4803",
  "#4804",
  "#4805",
  "#4806",
  "#4807",
  "#4808",
];
const DURATION = [6.2, 6.4, 6.1, 9.8, 6.3, 6.0, 6.6, 6.2];
const CAUSE = [
  "",
  "",
  "",
  "cold cache after the runner image bump",
  "",
  "",
  "",
  "",
];

export default function BuildTimeChart() {
  const [picked, setPicked] = useState<number>(3);

  return (
    <div>
      <Root
        highlight={{ index: picked }}
        onMarkClick={(datum: MarkDatum) => {
          if (datum.index !== undefined) setPicked(datum.index);
        }}
      >
        <Line
          title="CI duration, minutes"
          labels={BUILDS}
          data={DURATION}
          yTicks={3}
        />
      </Root>
      <p className="text-muted-foreground mt-3 text-sm">
        <span className="text-foreground font-medium">{BUILDS[picked]}</span>{" "}
        took <span className="tabular-nums">{DURATION[picked]} min</span>
        {CAUSE[picked] ? `: ${CAUSE[picked]}.` : "."} Click a point to inspect
        another build.
      </p>
    </div>
  );
}
