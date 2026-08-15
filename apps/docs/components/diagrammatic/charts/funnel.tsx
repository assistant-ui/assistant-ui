import { BLUE, TXT, VIEWBOX } from "./lib";

const STAGES = [
  { label: "visited", rate: "100%", share: 1 },
  { label: "signed up", rate: "72%", share: 0.72 },
  { label: "activated", rate: "50%", share: 0.5 },
  { label: "subscribed", rate: "34%", share: 0.34 },
  { label: "retained", rate: "22%", share: 0.22 },
];

export function FunnelChart() {
  const full = 168;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {STAGES.map((stage, i) => {
        const w0 = full * stage.share;
        const next = STAGES[i + 1]?.share ?? stage.share * 0.8;
        const w1 = full * next;
        const y = 10 + i * 20.5;
        return (
          <g key={stage.label}>
            <path
              d={`M${100 - w0 / 2} ${y} H${100 + w0 / 2} L${100 + w1 / 2} ${y + 18.5} H${100 - w1 / 2} Z`}
              fill={BLUE}
              opacity={0.92 - i * 0.17}
            />
            <text x="100" y={y + 11.4} textAnchor="middle" {...TXT.onSeries}>
              {stage.label} · {stage.rate}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
