import type { ReactNode } from "react";

export const CenteredMessage = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
    {children}
  </div>
);
