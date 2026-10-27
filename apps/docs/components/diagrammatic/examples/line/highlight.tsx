"use client";

import { useState } from "react";
import { Line } from "diagrammatic";
import { Root } from "diagrammatic/interactive";

const SERIES = [
  { name: "search", data: [42, 48, 51, 58, 61, 66, 64, 71, 77, 82] },
  { name: "direct", data: [30, 29, 33, 35, 34, 38, 41, 40, 43, 45] },
  { name: "referral", data: [12, 15, 14, 18, 22, 21, 25, 29, 28, 33] },
  { name: "social", data: [8, 9, 13, 12, 11, 15, 14, 18, 21, 19] },
];

export default function ChannelChart() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SERIES.map((s) => (
          <button
            key={s.name}
            type="button"
            aria-pressed={selected === s.name}
            onClick={() => setSelected(selected === s.name ? null : s.name)}
            className="aria-pressed:bg-foreground aria-pressed:text-background rounded-md border px-2 py-1 text-xs"
          >
            {s.name}
          </button>
        ))}
      </div>
      <Root
        {...(selected && { highlight: { series: selected } })}
        highlightOnHover="series"
      >
        <Line
          title="Weekly sessions by channel, thousands"
          labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"]}
          series={SERIES}
          yTicks={4}
        />
      </Root>
    </div>
  );
}
