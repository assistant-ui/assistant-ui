import { NEG, POS, TXT, VIEWBOX } from "./lib";

const TEAMS = [
  { label: "eng", values: [8, 16, 18, 34, 24] },
  { label: "design", values: [14, 24, 22, 26, 14] },
  { label: "sales", values: [4, 10, 14, 40, 32] },
  { label: "support", values: [22, 30, 20, 18, 10] },
];

export function DivergingStackedChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {TEAMS.map((row, i) => {
        const y = 13 + i * 22;
        const [strongNeg, neg, neutral, pos, strongPos] = row.values;
        const negWidth = (strongNeg! + neg! + neutral! / 2) * 0.78;
        let x = 110 - negWidth;
        const segments = [
          { w: strongNeg!, fill: NEG, opacity: 0.9 },
          { w: neg!, fill: NEG, opacity: 0.45 },
          { w: neutral!, fill: undefined, opacity: 1 },
          { w: pos!, fill: POS, opacity: 0.45 },
          { w: strongPos!, fill: POS, opacity: 0.9 },
        ];
        return (
          <g key={row.label}>
            <text x="8" y={y + 8.6} {...TXT.axis}>
              {row.label}
            </text>
            {segments.map((seg, k) => {
              const w = seg.w * 0.78 - 1.6;
              const x0 = x;
              x += seg.w * 0.78;
              return (
                <rect
                  key={k}
                  x={x0}
                  y={y}
                  width={w}
                  height="12"
                  rx="2.5"
                  {...(seg.fill
                    ? { fill: seg.fill, opacity: seg.opacity }
                    : {})}
                  className={seg.fill ? "" : "fill-foreground/15"}
                />
              );
            })}
          </g>
        );
      })}
      <text x="34" y="112" fontSize="4.5" fill={NEG} className="font-mono">
        ← disagree
      </text>
      <text x="110" y="112" textAnchor="middle" {...TXT.axis}>
        neutral
      </text>
      <text
        x="186"
        y="112"
        textAnchor="end"
        fontSize="4.5"
        fill={POS}
        className="font-mono"
      >
        agree →
      </text>
    </svg>
  );
}
