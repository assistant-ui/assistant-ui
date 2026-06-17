import type { ReactNode } from "react";

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="text-muted-foreground border-border flex items-center justify-center rounded-lg border border-dashed p-6 text-center text-[13px]">
    {children}
  </div>
);
