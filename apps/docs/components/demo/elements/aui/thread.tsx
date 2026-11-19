"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { DemoSurface } from "./surface";

export function AuiThreadDemo() {
  return (
    <SampleRuntimeProvider>
      <DemoSurface className="bg-muted/40">
        <div className="h-full w-full">
          <Thread />
        </div>
      </DemoSurface>
    </SampleRuntimeProvider>
  );
}
