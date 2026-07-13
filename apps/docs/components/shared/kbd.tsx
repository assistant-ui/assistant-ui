import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="text-muted-foreground border-border/60 bg-muted/50 min-w-4 rounded-[3px] border px-1 text-center font-mono text-[10px] leading-4">
      {children}
    </kbd>
  );
}
