import clsx from "clsx";

/**
 * A monochrome trend line drawn as an SVG polyline. No axes, legend, or
 * gridlines: it answers "is this metric rising, falling, or spiking" at a
 * glance and nothing more. Renders nothing below 2 points; color comes from the
 * surrounding text color (`currentColor`).
 */
export const Sparkline = ({
  values,
  className,
}: {
  values: readonly number[];
  className?: string;
}) => {
  if (values.length < 2) return null;

  const width = 100;
  const height = 24;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const point = (value: number, index: number) =>
    `${(index * step).toFixed(1)},${(height - ((value - min) / range) * height).toFixed(1)}`;
  const points = values.map(point).join(" ");
  const lastValue = values[values.length - 1]!;
  const [lastX, lastY] = point(lastValue, values.length - 1).split(",");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={clsx("text-muted-foreground", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2" fill="currentColor" />
    </svg>
  );
};
