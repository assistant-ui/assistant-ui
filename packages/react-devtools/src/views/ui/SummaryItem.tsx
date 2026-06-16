import type { ReactNode } from "react";

export const SummaryItem = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="bg-muted/40 rounded-md border p-3 text-xs">
    <div className="text-muted-foreground text-[10px] font-medium">{label}</div>
    <div className="text-foreground mt-1 font-medium">{value}</div>
  </div>
);
