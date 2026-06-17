import type { ReactNode } from "react";

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-muted-foreground text-[11px] font-medium">
    {children}
  </div>
);
