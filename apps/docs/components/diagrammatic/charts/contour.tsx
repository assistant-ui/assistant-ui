import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const RINGS = [
  { rx: 72, ry: 40, tilt: -14, opacity: 0.25 },
  { rx: 55, ry: 30, tilt: -12, opacity: 0.4 },
  { rx: 39, ry: 20, tilt: -10, opacity: 0.6 },
  { rx: 24, ry: 12, tilt: -8, opacity: 0.85 },
];

export function ContourChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {RINGS.map((ringSpec, i) => (
        <ellipse
          key={i}
          cx={98 - i * 4}
          cy={56 + i * 1.5}
          rx={ringSpec.rx}
          ry={ringSpec.ry}
          transform={`rotate(${ringSpec.tilt} ${98 - i * 4} ${56 + i * 1.5})`}
          fill={BLUE}
          fillOpacity={0.045}
          stroke={BLUE}
          strokeOpacity={ringSpec.opacity}
          {...stroke.medium}
        />
      ))}
      <text x="19" y="16" {...TXT.axis}>
        weight ↑
      </text>
      <text x="186" y="112" textAnchor="end" {...TXT.axis}>
        height → · 5k runners
      </text>
    </svg>
  );
}
