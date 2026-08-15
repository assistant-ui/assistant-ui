import { CAT, Legend, TXT, VIEWBOX, polar, round, stroke } from "./lib";

const SKILLS = ["code", "reason", "write", "vision", "speed"];
const MODELS = [
  { name: "atlas-1", values: [0.85, 0.7, 0.6, 0.8, 0.75] },
  { name: "nova-2", values: [0.55, 0.85, 0.75, 0.45, 0.6] },
];

function polygon(values: number[], radius: number): string {
  const pts = values.map((v, i) =>
    polar(100, 58, v * radius, (i / SKILLS.length) * Math.PI * 2 - Math.PI / 2),
  );
  return `M${pts.map((p) => `${round(p.x)} ${round(p.y)}`).join(" L")} Z`;
}

export function RadarChart() {
  const web = [1, 0.66, 0.33];
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {web.map((level) => (
        <path
          key={level}
          d={polygon(
            SKILLS.map(() => level),
            42,
          )}
          fill="none"
          className="stroke-foreground/12"
          {...stroke.hair}
        />
      ))}
      {SKILLS.map((skill, i) => {
        const angle = (i / SKILLS.length) * Math.PI * 2 - Math.PI / 2;
        const tip = polar(100, 58, 42, angle);
        const label = polar(100, 58, 50, angle);
        return (
          <g key={skill}>
            <line
              x1="100"
              y1="58"
              x2={round(tip.x)}
              y2={round(tip.y)}
              className="stroke-foreground/12"
              {...stroke.hair}
            />
            <text
              x={round(label.x)}
              y={round(label.y) + 1.8}
              textAnchor="middle"
              {...TXT.axis}
            >
              {skill}
            </text>
          </g>
        );
      })}
      {MODELS.map((model, k) => (
        <path
          key={model.name}
          d={polygon(model.values, 42)}
          fill={CAT[k === 0 ? 0 : 2]}
          fillOpacity="0.14"
          stroke={CAT[k === 0 ? 0 : 2]}
          strokeLinejoin="round"
          {...stroke.line}
        />
      ))}
      <Legend
        x={192}
        y={114}
        anchor="end"
        items={MODELS.map((m, k) => ({
          label: m.name,
          fill: CAT[k === 0 ? 0 : 2],
        }))}
      />
    </svg>
  );
}
