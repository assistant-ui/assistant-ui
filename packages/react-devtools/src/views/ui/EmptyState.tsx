import type { ReactNode } from "react";

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
    {children}
  </div>
);
