import { cn } from "@/lib/utils";

type Props = {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
};

export function Sparkline({
  values,
  className,
  width = 64,
  height = 18,
}: Props) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);

  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L${(width).toFixed(2)} ${height} L0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("text-foreground/60", className)}
      role="img"
    >
      <title>Weekly downloads trend</title>
      <path d={areaPath} fill="currentColor" fillOpacity={0.08} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
