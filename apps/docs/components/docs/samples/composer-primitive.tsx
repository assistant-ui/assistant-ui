"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import { SendHorizontalIcon } from "lucide-react";

export function ComposerPrimitiveSample() {
  return (
    <div className="not-prose flex items-end rounded-xl border border-border/50 bg-muted/40 p-4">
      <div className="mx-auto w-full max-w-lg">
        <ComposerPrimitive.Root className="flex items-end gap-2 rounded-xl border bg-background p-2">
          <ComposerPrimitive.Input
            placeholder="Ask anything..."
            className="field-sizing-content min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 focus:outline-none"
            rows={1}
          />
          <ComposerPrimitive.Send className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-30">
            <SendHorizontalIcon className="size-4" />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </div>
  );
}
