"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const MESSAGE_COUNT = 20;

export function ScrollbarSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-background">
      <ScrollAreaPrimitive.Root className="h-48 w-full overflow-hidden">
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
        <ScrollAreaPrimitive.Scrollbar
          className="flex touch-none select-none bg-muted p-0.5 transition-colors hover:bg-muted/80 data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col"
          orientation="vertical"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
        </ScrollAreaPrimitive.Scrollbar>
      </ScrollAreaPrimitive.Root>
    </SampleFrame>
  );
}
