interface MetricCardProps {
  label: string;
  value: string;
  variant?: "default" | "positive" | "negative";
}

export function MetricCard({
  label,
  value,
  variant = "default",
}: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${variant}`}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}
