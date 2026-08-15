import { CAT, Legend, TXT, VIEWBOX, barPath, stroke } from "./lib";

const REGIONS = ["NA", "EU", "APAC"];
const PLANS = ["free", "pro", "team"];
const DATA = [
  [46, 34, 20],
  [62, 48, 36],
  [78, 55, 30],
];

export function GroupedBarChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="10"
        y1="100"
        x2="190"
        y2="100"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      <Legend
        x={14}
        y={12}
        items={PLANS.map((p, k) => ({ label: p, fill: CAT[k] }))}
      />
      {DATA.map((group, g) =>
        group.map((v, k) => (
          <path
            key={`${g}-${k}`}
            d={barPath(
              26 + g * 58 + k * 15,
              100 - v * 0.86,
              12,
              v * 0.86,
              2.5,
              "top",
            )}
            fill={CAT[k]}
            opacity="0.9"
          />
        )),
      )}
      {REGIONS.map((label, g) => (
        <text
          key={label}
          x={26 + g * 58 + 21}
          y="112"
          textAnchor="middle"
          {...TXT.axis}
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
