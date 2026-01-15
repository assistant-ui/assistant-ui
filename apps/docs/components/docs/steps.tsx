import type { ReactNode } from "react";

export function Steps({ children }: { children: ReactNode }) {
  return (
    <div className="steps-container not-prose flex min-w-0 flex-col">
      {children}
    </div>
  );
}

export function Step({ children }: { children: ReactNode }) {
  return (
    <div className="group relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fd-muted font-medium text-fd-muted-foreground text-sm">
          <span className="step-number" />
        </div>
        <div className="w-px flex-1 bg-fd-border group-last:hidden" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5 pb-6 group-last:pb-0 [&>h3]:mt-0 [&>h3]:mb-3 [&>h3]:font-medium [&>h3]:text-base">
        {children}
      </div>
    </div>
  );
}
