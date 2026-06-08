import type { ReactNode } from "react";

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-muted-foreground text-xs font-medium">{children}</div>
);
