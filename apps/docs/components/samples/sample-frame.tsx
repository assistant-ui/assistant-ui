"use client";

import { cn } from "@/lib/utils";

export const SampleFrame = ({
  sampleText,
  description,
  children,
  className,
}: {
  sampleText?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className="bg-accent/75 relative rounded-lg border p-4">
      <div className="bg-primary text-primary-foreground absolute -top-2 left-4 rounded px-2 py-0.5 text-xs">
        {sampleText || "Sample"}
      </div>
      {description && (
        <div className="text-muted-foreground py-2 text-sm">{description}</div>
      )}
      <div
        className={cn(
          `h-[650px] *:overflow-hidden *:rounded-lg *:border`,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};
