import type { ReactNode } from "react";

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full items-center justify-center">
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      {children}
    </div>
  </div>
);
