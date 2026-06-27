export function StyledTable({
  columns,
  rows,
  children,
}: {
  columns?: { label: string }[];
  rows?: (string | number | boolean)[][];
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        {columns?.length ? (
          <thead>
            <tr className="border-border/60 border-b">
              {columns.map((c, i) => (
                <th
                  key={i}
                  className="text-muted-foreground pr-4 pb-2 text-left text-[11px] font-medium tracking-wide uppercase"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        {rows?.length ? (
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-border/40 border-b last:border-0">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="text-foreground py-2.5 pr-4 text-sm"
                    style={
                      c === row.length - 1 ? { textAlign: "right" } : undefined
                    }
                  >
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ) : null}
        {children}
      </table>
    </div>
  );
}

export function StyledMarkdown({
  value,
  children,
}: {
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
      {value}
      {children}
    </div>
  );
}

export function StyledChart({
  variant,
  data,
  color,
}: {
  variant: string;
  data: { label?: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const strokeColor = color ?? "hsl(var(--primary))";

  if (variant === "line" || variant === "sparkline") {
    const points = data
      .map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * 100;
        const y = 100 - ((d.value - min) / range) * 70 - 15;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <div className="w-full" data-aui-chart={variant}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-32 w-full"
        >
          <polyline
            points={`0,100 ${points} 100,100`}
            fill={`${strokeColor}15`}
            stroke="none"
          />
          <polyline
            points={points}
            fill="none"
            stroke={strokeColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * 100;
            const y = 100 - ((d.value - min) / range) * 70 - 15;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={1.5}
                fill={strokeColor}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {data.some((d) => d.label) ? (
          <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px]">
            {data.map((d, i) => (
              <span key={i}>{d.label}</span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex items-end justify-between gap-2"
      data-aui-chart={variant}
      style={{ height: "140px" }}
    >
      {data.map((d, i) => (
        <div
          key={i}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
        >
          <div
            className="w-full max-w-[36px] rounded-t-lg"
            style={{
              height: `${Math.max(((d.value - min) / range) * 100, 6)}%`,
              backgroundColor: strokeColor,
              minHeight: "6px",
            }}
          />
          {d.label ? (
            <span className="text-muted-foreground text-[10px]">{d.label}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
