import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const NODES = [
  { id: "api", x: 100, y: 58, r: 8, hub: true, named: true },
  { id: "web", x: 54, y: 30, r: 5.5, named: true },
  { id: "db", x: 150, y: 32, r: 6, named: true },
  { id: "jobs", x: 58, y: 88, r: 5, named: true },
  { id: "cache", x: 148, y: 86, r: 4.5, named: true },
  { id: "a1", x: 26, y: 16, r: 3 },
  { id: "a2", x: 30, y: 46, r: 3.4 },
  { id: "b1", x: 178, y: 18, r: 3.2 },
  { id: "b2", x: 182, y: 48, r: 3 },
  { id: "c1", x: 30, y: 102, r: 3 },
  { id: "d1", x: 180, y: 102, r: 3 },
  { id: "auth", x: 104, y: 14, r: 3.4, named: true },
];

const EDGES: Array<[string, string]> = [
  ["api", "web"],
  ["api", "db"],
  ["api", "jobs"],
  ["api", "cache"],
  ["api", "auth"],
  ["web", "a1"],
  ["web", "a2"],
  ["db", "b1"],
  ["db", "b2"],
  ["jobs", "c1"],
  ["cache", "d1"],
  ["web", "db"],
];

export function NetworkChart() {
  const byId = new Map(NODES.map((n) => [n.id, n]));
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {EDGES.map(([from, to]) => {
        const a = byId.get(from)!;
        const b = byId.get(to)!;
        return (
          <line
            key={`${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="stroke-foreground/20"
            {...stroke.hair}
          />
        );
      })}
      {NODES.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            {...(n.hub ? { fill: BLUE } : {})}
            className={n.hub ? "" : "fill-foreground/50"}
          />
          {n.named && (
            <text x={n.x + n.r + 3} y={n.y + 1.8} {...TXT.axis}>
              {n.id}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
