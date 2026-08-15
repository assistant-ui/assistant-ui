import { CAT, TXT, VIEWBOX, round } from "./lib";

const X0 = 19;
const X1 = 181;

function ribbon(y0: number, y1: number, y2: number, y3: number): string {
  const mx = round((X0 + X1) / 2);
  return `M${X0} ${y0} C${mx} ${y0} ${mx} ${y2} ${X1} ${y2} L${X1} ${y3} C${mx} ${y3} ${mx} ${y1} ${X0} ${y1} Z`;
}

const FLOWS = [
  { d: ribbon(17, 45, 12, 40), series: 0, opacity: 0.32 },
  { d: ribbon(45, 63, 48, 66), series: 0, opacity: 0.2 },
  { d: ribbon(71, 83, 66, 78), series: 1, opacity: 0.22 },
  { d: ribbon(83, 103, 86, 106), series: 1, opacity: 0.32 },
];

const SOURCES = [
  { label: "solar 46 TWh", y: 40 },
  { label: "gas 32 TWh", y: 87 },
];
const USES = [
  { label: "homes", y: 26 },
  { label: "industry", y: 63 },
  { label: "transport", y: 96 },
];

export function SankeyChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {FLOWS.map((flow, i) => (
        <path
          key={i}
          d={flow.d}
          fill={CAT[flow.series]}
          opacity={flow.opacity}
        />
      ))}
      <rect x="14" y="17" width="5" height="46" rx="2" fill={CAT[0]} />
      <rect x="14" y="71" width="5" height="32" rx="2" fill={CAT[1]} />
      <rect
        x="181"
        y="12"
        width="5"
        height="28"
        rx="2"
        className="fill-foreground/45"
      />
      <rect
        x="181"
        y="48"
        width="5"
        height="30"
        rx="2"
        className="fill-foreground/45"
      />
      <rect
        x="181"
        y="86"
        width="5"
        height="20"
        rx="2"
        className="fill-foreground/45"
      />
      {SOURCES.map((node) => (
        <text key={node.label} x="24" y={node.y} {...TXT.label}>
          {node.label}
        </text>
      ))}
      {USES.map((node) => (
        <text
          key={node.label}
          x="176"
          y={node.y}
          textAnchor="end"
          {...TXT.label}
        >
          {node.label}
        </text>
      ))}
    </svg>
  );
}
