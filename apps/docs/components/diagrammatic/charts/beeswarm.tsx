import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const DOTS: Array<[number, number]> = [
  [30, 0],
  [38, 0],
  [44, 1],
  [44, -1],
  [50, 0],
  [52, 2],
  [54, -2],
  [58, 1],
  [58, -1],
  [62, 0],
  [64, 2],
  [64, -2],
  [66, 3],
  [68, -3],
  [70, 1],
  [70, -1],
  [74, 0],
  [76, 2],
  [76, -2],
  [80, 1],
  [80, -1],
  [84, 0],
  [88, 2],
  [88, -2],
  [92, 0],
  [96, 1],
  [100, -1],
  [104, 0],
  [112, 0],
  [120, 1],
  [128, 0],
  [148, 0],
];

export function BeeswarmChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="12"
        y1="58"
        x2="188"
        y2="58"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      {DOTS.map(([x, lane], i) => {
        const outlier = x >= 140;
        return (
          <g key={i}>
            <circle
              cx={x + 16}
              cy={58 + lane * 8.4}
              r="3.6"
              {...(outlier ? { fill: BLUE } : {})}
              className={outlier ? "" : "fill-foreground/45"}
            />
            {outlier && (
              <text
                x={x + 16}
                y="42"
                textAnchor="middle"
                fontSize="4.5"
                fill={BLUE}
                className="font-mono"
              >
                48h
              </text>
            )}
          </g>
        );
      })}
      {["0h", "12h", "24h", "36h"].map((t, i) => (
        <text key={t} x={40 + i * 45} y="108" textAnchor="middle" {...TXT.axis}>
          {t}
        </text>
      ))}
    </svg>
  );
}
