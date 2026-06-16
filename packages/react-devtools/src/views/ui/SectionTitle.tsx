import type { ReactNode } from "react";

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="text-foreground mb-2 text-sm font-semibold">{children}</h3>
);
