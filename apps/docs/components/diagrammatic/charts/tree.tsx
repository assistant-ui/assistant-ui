import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const BRANCHES = [
  { x: 46, y: 56, label: "eng" },
  { x: 100, y: 56, label: "design" },
  { x: 154, y: 56, label: "gtm" },
];
const LEAVES = [
  { x: 28, parent: 0 },
  { x: 64, parent: 0 },
  { x: 100, parent: 1 },
  { x: 136, parent: 2 },
  { x: 172, parent: 2 },
];

export function TreeChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {BRANCHES.map((node) => (
        <path
          key={node.label}
          d={`M100 20 C100 40 ${node.x} 36 ${node.x} ${node.y}`}
          fill="none"
          className="stroke-foreground/25"
          {...stroke.hair}
        />
      ))}
      {LEAVES.map((leaf, i) => {
        const parent = BRANCHES[leaf.parent]!;
        return (
          <path
            key={i}
            d={`M${parent.x} ${parent.y} C${parent.x} 78 ${leaf.x} 74 ${leaf.x} 94`}
            fill="none"
            className="stroke-foreground/25"
            {...stroke.hair}
          />
        );
      })}
      <circle cx="100" cy="20" r="6" fill={BLUE} />
      <text x="109" y="21.8" {...TXT.label}>
        ceo
      </text>
      {BRANCHES.map((node) => (
        <g key={node.label}>
          <circle
            cx={node.x}
            cy={node.y}
            r="4.5"
            className="fill-foreground/55"
          />
          <text x={node.x + 8} y={node.y + 1.8} {...TXT.axis}>
            {node.label}
          </text>
        </g>
      ))}
      {LEAVES.map((leaf, i) => (
        <circle
          key={i}
          cx={leaf.x}
          cy="94"
          r="3.2"
          className="fill-foreground/35"
        />
      ))}
    </svg>
  );
}
