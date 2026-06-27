export function StyledCard({
  title,
  padding,
  background,
  children,
}: {
  title?: string;
  padding?: number;
  background?: string;
  children?: React.ReactNode;
}) {
  const padMap: Record<number, string> = {
    1: "p-1",
    2: "p-2",
    3: "p-3",
    4: "p-4",
    6: "p-6",
  };
  const isColored = background !== undefined;
  const titleColor = isColored ? "text-white" : "text-foreground";
  const borderColor = isColored ? "border-white/15" : "border-border/60";

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border"
      style={{
        ...(background ? { background } : {}),
        ...(isColored ? { color: "white" } : {}),
      }}
    >
      {title ? (
        <div className={`border-b px-5 py-3.5 ${borderColor}`}>
          <h3 className={`${titleColor} text-sm font-semibold`}>{title}</h3>
        </div>
      ) : null}
      <div className={padMap[padding ?? 5] ?? "p-5"}>{children}</div>
    </div>
  );
}

export function StyledCol({
  gap,
  align,
  children,
}: {
  gap?: number;
  align?: string;
  children?: React.ReactNode;
}) {
  const gapMap: Record<number, string> = {
    0: "gap-0",
    1: "gap-1",
    2: "gap-2",
    3: "gap-3",
    4: "gap-4",
    6: "gap-6",
  };
  const alignMap: Record<string, string> = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
  };
  return (
    <div
      className={`flex flex-col ${gapMap[gap ?? 3]!} ${alignMap[align ?? "stretch"] ?? "items-stretch"}`}
    >
      {children}
    </div>
  );
}

export function StyledRow({
  gap,
  align,
  justify,
  children,
}: {
  gap?: number;
  align?: string;
  justify?: string;
  children?: React.ReactNode;
}) {
  const gapMap: Record<number, string> = {
    0: "gap-0",
    1: "gap-1",
    2: "gap-2",
    3: "gap-3",
    4: "gap-4",
    6: "gap-6",
  };
  const alignMap: Record<string, string> = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
  };
  const justifyMap: Record<string, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };
  return (
    <div
      className={`flex flex-row ${gapMap[gap ?? 3]!} ${alignMap[align ?? "center"]!} ${justifyMap[justify ?? "start"]!}`}
    >
      {children}
    </div>
  );
}

export function StyledSpacer() {
  return <div className="h-2" />;
}

export function StyledBadge({
  value,
  variant,
  children,
}: {
  value: string;
  variant?: string;
  children?: React.ReactNode;
}) {
  const variants: Record<string, string> = {
    secondary: "bg-white/10 text-white",
    outline: "border border-white/20 text-white",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-emerald-500/15 text-emerald-300",
    warning: "bg-amber-500/15 text-amber-300",
  };
  const lightVariants: Record<string, string> = {
    secondary: "bg-muted text-muted-foreground",
    outline: "border border-border text-foreground",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant ?? "default"] ?? lightVariants[variant ?? "default"] ?? "bg-muted text-muted-foreground"}`}
    >
      {value}
      {children}
    </span>
  );
}
