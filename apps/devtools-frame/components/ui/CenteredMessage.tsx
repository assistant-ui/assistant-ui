import type { ReactNode } from "react";

export const CenteredMessage = ({ children }: { children: ReactNode }) => (
  <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
    {children}
  </div>
);
