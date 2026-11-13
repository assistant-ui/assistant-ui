"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";

const sampleClassName =
  "[&_.not-prose]:m-0! [&_.not-prose]:h-full [&_.not-prose]:w-full [&_.not-prose>div]:h-full! [&_.not-prose>div]:min-h-0!";

export function DemoSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden",
        sampleClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RuntimeDemo({ children }: { children: ReactNode }) {
  return (
    <SampleRuntimeProvider>
      <DemoSurface>{children}</DemoSurface>
    </SampleRuntimeProvider>
  );
}
