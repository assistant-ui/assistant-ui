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
      <div className="absolute -top-2 left-4 rounded bg-primary px-2 py-0.5 text-primary-foreground text-xs">
        {sampleText || "Sample"}
      </div>
      {description && (
        <div className="py-2 text-muted-foreground text-sm">{description}</div>
      )}
      <div
        className={cn(
          `h-[650px] [--primary-foreground:0_0%_98%] [--primary:0_0%_9%] *:overflow-hidden *:rounded-lg *:border dark:[--primary-foreground:0_0%_9%] dark:[--primary:0_0%_98%] [&_img]:my-0 [&_p:has(>span)]:my-0`,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};
