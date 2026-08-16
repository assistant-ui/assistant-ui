import { Gauge } from "diagrammatic";
import type { DemoExample } from "./types";

export const glyph = (
  <Gauge value={0.68} display="68%" label="error budget used" />
);

export const examples: DemoExample[] = [
  {
    title: "The instrument cluster: three dials, one glance",
    setup:
      "A car's dashboard is not one gauge, it is a cluster — so this figure composes three: the tachometer large in the center, speed and oil temperature small at its sides, each with its own ring, minors, and red zone. The dials are all data props (`ticks`, `minorTicks`, `redline`, `needle`); the cluster layout — and even the tick-label size, bumped with one CSS rule on the grid seam — is your own markup, because arranging instruments is composition, not a component.",
    read: "One glance, three readings: 172 on the speedo, the tach needle two major ticks shy of the 7.2k redline, and oil at 94° with headroom before its own red band. Every zone-crossing rule travels with each dial — red ticks past each limit, needles that flip red only when they cross — so the cluster stays readable at speed, which is the whole design brief of a dashboard.",
    chart: (
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1.15fr_1.5fr_1.15fr] [&_[data-part=grid]_text]:[font-size:7.2px]">
        <Gauge
          needle
          value={172 / 300}
          display="172"
          label="km/h"
          min=""
          max=""
          minorTicks={30}
          ticks={[
            { at: 0, label: "0" },
            { at: 1 / 3, label: "100" },
            { at: 2 / 3, label: "200" },
            { at: 1, label: "300" },
          ]}
        />
        <Gauge
          needle
          value={0.756}
          display="6.8k"
          label="rpm"
          min=""
          max=""
          redline={0.8}
          minorTicks={45}
          ticks={[
            { at: 0, label: "0" },
            { at: 1 / 9, label: "1" },
            { at: 2 / 9, label: "2" },
            { at: 3 / 9, label: "3" },
            { at: 4 / 9, label: "4" },
            { at: 5 / 9, label: "5" },
            { at: 6 / 9, label: "6" },
            { at: 7 / 9, label: "7" },
            { at: 8 / 9, label: "8" },
            { at: 1, label: "9" },
          ]}
        />
        <Gauge
          needle
          value={0.57}
          display="94°"
          label="oil"
          min=""
          max=""
          redline={0.85}
          minorTicks={20}
          ticks={[
            { at: 0, label: "60" },
            { at: 0.5, label: "90" },
            { at: 1, label: "120" },
          ]}
        />
      </div>
    ),
  },
];
