import type { ReactNode } from "react";

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-2 font-semibold text-sm text-zinc-800 dark:text-zinc-100">
    {children}
  </h3>
);
