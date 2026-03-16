"use client";

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { cn } from "@/lib/utils";

const MESSAGE_COUNT = 20;

const ScrollBar = ({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    orientation={orientation}
    className={cn("flex touch-none select-none p-px transition-colors", {
      "h-full w-2.5 border-l border-l-transparent": orientation === "vertical",
      "h-2.5 flex-col border-t border-t-transparent":
        orientation === "horizontal",
    })}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
);

export function ScrollbarSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-background">
      <ScrollAreaPrimitive.Root className="relative h-48 w-full overflow-hidden">
        <ScrollAreaPrimitive.Viewport className="h-full w-full rounded p-4">
          <div className="space-y-4">
            {Array.from({ length: MESSAGE_COUNT }, (_, i) => (
              <p key={i} className="text-sm">
                Message {i + 1}: This is a sample message to demonstrate the
                custom scrollbar styling with Radix UI ScrollArea.
              </p>
            ))}
          </div>
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
      </ScrollAreaPrimitive.Root>
    </SampleFrame>
  );
}
