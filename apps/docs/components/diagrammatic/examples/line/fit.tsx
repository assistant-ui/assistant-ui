"use client";

import { Line } from "diagrammatic";
import { Fit } from "diagrammatic/interactive";

export default function FluidChart() {
  return (
    <Fit>
      {({ width }) => (
        <Line
          title="Daily signups"
          width={width}
          aspect={3}
          labels={[
            "1",
            "",
            "",
            "",
            "5",
            "",
            "",
            "",
            "",
            "10",
            "",
            "",
            "",
            "",
            "15",
          ]}
          data={[12, 14, 13, 17, 21, 19, 24, 28, 27, 33, 31, 36, 41, 39, 45]}
          yTicks={3}
        />
      )}
    </Fit>
  );
}
