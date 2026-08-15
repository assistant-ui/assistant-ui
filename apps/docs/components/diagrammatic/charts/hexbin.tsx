import { BLUE, TXT, VIEWBOX, polar, round, seqOpacity } from "./lib";

function hexPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) =>
    polar(cx, cy, r, (Math.PI / 3) * i + Math.PI / 6),
  );
  return `M${pts.map((p) => `${round(p.x)} ${round(p.y)}`).join(" L")} Z`;
}

export function HexbinChart() {
  const hexes = [];
  const r = 8.6;
  const dx = r * Math.sqrt(3);
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 12; col += 1) {
      const cx = 18 + col * dx + (row % 2 ? dx / 2 : 0);
      const cy = 13 + row * r * 1.5;
      if (cx > 192) continue;
      const d = Math.hypot(cx - 92, (cy - 52) * 1.5);
      const v = Math.max(0, 1 - d / 78);
      if (v <= 0.04) continue;
      hexes.push({ cx, cy, v });
    }
  }
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {hexes.map((h, i) => (
        <path
          key={i}
          d={hexPath(h.cx, h.cy, r - 1)}
          fill={BLUE}
          opacity={seqOpacity(h.v)}
        />
      ))}
      {[0.15, 0.4, 0.7, 1].map((v, i) => (
        <path
          key={i}
          d={hexPath(130 + i * 11, 110, 4.6)}
          fill={BLUE}
          opacity={seqOpacity(v)}
        />
      ))}
      <text x="124" y="112" textAnchor="end" {...TXT.axis}>
        rides: low
      </text>
      <text x="172" y="112" {...TXT.axis}>
        high
      </text>
    </svg>
  );
}
