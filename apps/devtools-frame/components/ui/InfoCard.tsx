import type { ReactNode } from "react";

export const InfoCard = ({ children }: { children: ReactNode }) => (
  <div className="bg-card rounded-lg border p-4 transition-colors">
    {children}
  </div>
);
