"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import { ArrowUpIcon } from "lucide-react";
import { SampleRuntimeProvider } from "./sample-runtime-provider";

export function ComposerPrimitiveSample() {
  return (
    <SampleRuntimeProvider messages={[]}>
      <div className="not-prose flex items-end rounded-xl border border-border/50 bg-muted/40 p-6">
        <div className="mx-auto w-full max-w-lg">
          <ComposerPrimitive.Root className="relative flex w-full flex-col rounded-3xl border border-border bg-muted shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)] dark:border-muted-foreground/15">
            <ComposerPrimitive.Input
              placeholder="Ask anything..."
              className="field-sizing-content min-h-10 w-full resize-none bg-transparent px-5 pt-4 pb-3 text-sm leading-relaxed focus:outline-none"
              rows={1}
            />
            <div className="flex items-center justify-end px-3 pb-3">
              <ComposerPrimitive.Send className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30">
                <ArrowUpIcon className="size-4" />
              </ComposerPrimitive.Send>
            </div>
          </ComposerPrimitive.Root>
        </div>
      </div>
    </SampleRuntimeProvider>
  );
}
