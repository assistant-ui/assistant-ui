"use client";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  period?: string;
};

export function DashboardHeader({
  title,
  description,
  period,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {period ? (
        <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
          {period}
        </span>
      ) : null}
    </header>
  );
}
