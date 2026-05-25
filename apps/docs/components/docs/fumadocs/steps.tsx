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
        <div className="bg-fd-muted text-fd-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium">
          <span className="step-number" />
        </div>
        <div className="bg-fd-border w-px flex-1 group-last:hidden" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5 pb-6 group-last:pb-0 [&>h3]:mt-0 [&>h3]:mb-3 [&>h3]:text-base [&>h3]:font-medium">
        {children}
      </div>
    </div>
  );
}
