import type { ReactNode } from "react";

export const InfoCard = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
    {children}
  </div>
);
