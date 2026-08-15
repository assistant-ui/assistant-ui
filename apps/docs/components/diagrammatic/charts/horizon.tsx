import { BLUE, TXT, VIEWBOX, areaPath, scale, stroke } from "./lib";

const LOAD = [
  0.2, 0.35, 0.5, 0.42, 0.6, 0.75, 0.62, 0.8, 0.95, 0.85, 0.7, 0.9, 0.65, 0.5,
  0.6, 0.45, 0.3, 0.4,
];
const LAYERS = [0.25, 0.5, 0.85];
const HOURS = ["00", "06", "12", "18", "24"];

export function HorizonChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="10"
        y1="100"
        x2="190"
        y2="100"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      {LAYERS.map((opacity, layer) => {
        const values = LOAD.map((v) =>
          Math.max(0, Math.min(v * LAYERS.length - layer, 1)),
        );
        const pts = scale(values, 10, 190, 100, 22, 0, 1);
        return (
          <path
            key={layer}
            d={areaPath(pts, 100)}
            fill={BLUE}
            opacity={opacity}
          />
        );
      })}
      <text x="190" y="12" textAnchor="end" {...TXT.axis}>
        3 bands · darker = higher
      </text>
      {HOURS.map((h, i) => (
        <text key={h} x={10 + i * 45} y="112" textAnchor="middle" {...TXT.axis}>
          {h}
        </text>
      ))}
    </svg>
  );
}
