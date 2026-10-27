"use client";

import { Line } from "diagrammatic";
import { Root, Tooltip, getSeriesColor } from "diagrammatic/interactive";

const STEPS = Array.from({ length: 16 }, (_, i) => (i === 0 ? "0" : `${i}k`));
const SERIES = [
  {
    name: "baseline",
    data: [
      220, 244, 271, 301, 334, 369, 405, 441, 476, 509, 539, 566, 589, 608, 622,
      631,
    ],
  },
  {
    name: "fixed penalty",
    data: [
      220, 238, 252, 248, 225, 201, 182, 169, 161, 156, 153, 151, 150, 150, 149,
      149,
    ],
  },
  {
    name: "alternating",
    data: [
      220, 248, 282, 320, 352, 344, 310, 285, 272, 266, 269, 273, 272, 274, 273,
      275,
    ],
  },
];

export default function ResponseLengthChart() {
  return (
    <Root highlightOnHover="series">
      <Line
        title="Mean response length by training recipe"
        summary="Baseline grows to 631 tokens, the fixed penalty falls to 149, and only the alternating recipe settles in the 250 to 300 band."
        aspect={2.2}
        series={SERIES}
        labels={STEPS.map((step, i) => (i % 2 === 0 ? step : ""))}
        yTicks={[
          { at: 200, label: "200" },
          { at: 400, label: "400" },
          { at: 600, label: "600" },
        ]}
        bands={[{ lower: STEPS.map(() => 250), upper: STEPS.map(() => 300) }]}
        regions={[{ from: 4, to: 9, label: "alternating penalty" }]}
        guides={[{ at: 275, label: "target 275" }]}
        marks={[
          { series: "alternating", at: 4, label: "penalty on" },
          { series: "alternating", at: 9, label: "off" },
          { series: "baseline", at: 15, label: "631" },
          { series: "fixed penalty", at: 15, label: "149" },
        ]}
      />
      <Tooltip side="top">
        {({ datum }) => {
          const i = datum.index;
          if (i === undefined) return null;
          return (
            <div className="bg-popover text-popover-foreground w-max rounded-lg border px-2.5 py-1.5 text-xs shadow-md">
              <div className="text-muted-foreground mb-1">step {STEPS[i]}</div>
              {SERIES.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{
                      background: getSeriesColor(datum.element, s.name),
                    }}
                  />
                  <span className="flex-1">{s.name}</span>
                  <span className="tabular-nums">{s.data[i]}</span>
                </div>
              ))}
            </div>
          );
        }}
      </Tooltip>
    </Root>
  );
}
