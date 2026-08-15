import { CAT, Legend, VIEWBOX, bandPath, scale } from "./lib";

const GENRES = [
  { name: "pop", data: [8, 12, 16, 20, 24, 20, 16, 14, 12] },
  { name: "hip-hop", data: [6, 10, 14, 12, 16, 18, 14, 12, 10] },
  { name: "rock", data: [10, 8, 10, 14, 12, 16, 18, 16, 12] },
  { name: "lo-fi", data: [4, 6, 8, 8, 10, 12, 10, 12, 14] },
];

export function StreamgraphChart() {
  const totals = GENRES[0]!.data.map((_, i) =>
    GENRES.reduce((sum, s) => sum + s.data[i]!, 0),
  );
  const max = Math.max(...totals);
  const baseline = totals.map((t) => -t / 2);
  const cumulative = [baseline];
  for (const series of GENRES) {
    const prev = cumulative[cumulative.length - 1]!;
    cumulative.push(prev.map((v, i) => v + series.data[i]!));
  }
  const layer = (values: number[]) =>
    scale(values, 8, 192, 64 + 42, 64 - 42, -max / 2, max / 2);
  const layers = cumulative.map(layer);
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {GENRES.map((_, k) => (
        <path
          key={k}
          d={bandPath(layers[k + 1]!, layers[k]!)}
          fill={CAT[k]}
          opacity="0.75"
        />
      ))}
      <Legend
        x={8}
        y={11}
        items={GENRES.map((s, k) => ({ label: s.name, fill: CAT[k] }))}
      />
    </svg>
  );
}
