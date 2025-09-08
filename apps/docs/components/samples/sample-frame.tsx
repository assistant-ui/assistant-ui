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
    <div className="relative rounded-lg border bg-accent/75 p-4">
      <div className="absolute -top-2 left-4 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">
        {sampleText || "Sample"}
      </div>
      {description && (
        <div className="py-2 text-sm text-muted-foreground">{description}</div>
      )}
      <div
        className={cn(
          `h-[650px] *:overflow-hidden *:rounded-lg *:border [&_img]:my-0 [&_p:has(>span)]:my-0`,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};
