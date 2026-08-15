import { CAT, TXT, VIEWBOX } from "./lib";

const ANSWERS = [
  { label: "daily", share: 38 },
  { label: "weekly", share: 27 },
  { label: "monthly", share: 22 },
  { label: "never", share: 13 },
];

export function WaffleChart() {
  const cells = [];
  let series = 0;
  let used = 0;
  for (let i = 0; i < 100; i += 1) {
    if (series < ANSWERS.length - 1 && used >= ANSWERS[series]!.share) {
      series += 1;
      used = 0;
    }
    cells.push(series);
    used += 1;
  }
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {cells.map((s, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        return (
          <rect
            key={i}
            x={24 + col * 10}
            y={12 + row * 10}
            width="7.6"
            height="7.6"
            rx="2"
            fill={CAT[s]}
            opacity="0.88"
          />
        );
      })}
      {ANSWERS.map((answer, i) => (
        <g key={answer.label}>
          <circle cx="132" cy={38 + i * 15} r="2.4" fill={CAT[i]} />
          <text x="138" y={38 + i * 15 + 1.8} {...TXT.label}>
            {answer.label}
          </text>
          <text x="192" y={38 + i * 15 + 1.8} textAnchor="end" {...TXT.value}>
            {answer.share}%
          </text>
        </g>
      ))}
    </svg>
  );
}
