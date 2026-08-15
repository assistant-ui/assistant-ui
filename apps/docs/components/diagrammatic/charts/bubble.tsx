import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const COUNTRIES = [
  { x: 40, y: 78, r: 7 },
  { x: 62, y: 58, r: 11 },
  { x: 84, y: 74, r: 5 },
  { x: 96, y: 40, r: 15 },
  { x: 122, y: 58, r: 8 },
  { x: 138, y: 30, r: 12 },
  { x: 158, y: 48, r: 6 },
  { x: 168, y: 22, r: 9 },
  { x: 54, y: 30, r: 5.5 },
  { x: 30, y: 48, r: 4.5 },
];

export function BubbleChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="14"
        y1="102"
        x2="186"
        y2="102"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      <line
        x1="14"
        y1="102"
        x2="14"
        y2="10"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      {COUNTRIES.map((b, i) => (
        <circle
          key={i}
          cx={b.x}
          cy={b.y}
          r={b.r}
          fill={BLUE}
          fillOpacity="0.18"
          stroke={BLUE}
          strokeOpacity="0.75"
          {...stroke.medium}
        />
      ))}
      <text x="19" y="16" {...TXT.axis}>
        life expectancy ↑
      </text>
      <text x="186" y="112" textAnchor="end" {...TXT.axis}>
        gdp per capita → · size = population
      </text>
    </svg>
  );
}
