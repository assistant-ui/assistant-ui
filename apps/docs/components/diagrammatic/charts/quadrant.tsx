import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const IDEAS: Array<[number, number]> = [
  [48, 34],
  [66, 26],
  [58, 48],
  [134, 30],
  [150, 42],
  [142, 22],
  [162, 34],
  [44, 82],
  [60, 92],
  [72, 78],
  [128, 84],
  [148, 76],
  [160, 92],
  [96, 58],
];

export function QuadrantChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <rect
        x="14"
        y="10"
        width="172"
        height="96"
        rx="4"
        fill="none"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      <line
        x1="100"
        y1="10"
        x2="100"
        y2="106"
        className="stroke-foreground/15"
        {...stroke.hair}
      />
      <line
        x1="14"
        y1="58"
        x2="186"
        y2="58"
        className="stroke-foreground/15"
        {...stroke.hair}
      />
      <text x="18" y="17.5" {...TXT.axis}>
        quick wins
      </text>
      <text x="182" y="17.5" textAnchor="end" {...TXT.axis}>
        big bets
      </text>
      <text x="18" y="102" {...TXT.axis}>
        fill-ins
      </text>
      <text x="182" y="102" textAnchor="end" {...TXT.axis}>
        time sinks
      </text>
      {IDEAS.map(([x, y], i) => {
        const focus = x < 100 && y < 58;
        return (
          <circle
            key={i}
            cx={x}
            cy={y - 2}
            r="3.2"
            {...(focus ? { fill: BLUE } : {})}
            className={focus ? "" : "fill-foreground/40"}
          />
        );
      })}
      <text x="186" y="115" textAnchor="end" {...TXT.axis}>
        effort → · impact ↑
      </text>
    </svg>
  );
}
