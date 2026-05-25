"use client";

import { WrenchIcon } from "lucide-react";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";
import { createDirectiveText } from "@/components/assistant-ui/directive-text";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const SampleDirectiveText = createDirectiveText(
  unstable_defaultDirectiveFormatter,
  { iconMap: { tool: WrenchIcon } },
);

const COMPLETE_STATUS = { type: "complete" } as const;

export function DirectiveTextSample() {
  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-md flex-col items-end gap-2">
        <span className="text-muted-foreground text-xs">User message</span>
        <div className="bg-muted text-foreground rounded-2xl px-4 py-2.5 text-sm">
          <SampleDirectiveText
            type="text"
            text="Use :tool[Get Weather]{name=get_weather} to check today's forecast in Tokyo."
            status={COMPLETE_STATUS}
          />
        </div>
      </div>
      <div className="flex w-full max-w-md flex-col items-end gap-2">
        <span className="text-muted-foreground text-xs">Another example</span>
        <div className="bg-muted text-foreground rounded-2xl px-4 py-2.5 text-sm">
          <SampleDirectiveText
            type="text"
            text="Ask :tool[Search] for recent updates on :tool[Calendar]."
            status={COMPLETE_STATUS}
          />
        </div>
      </div>
    </SampleFrame>
  );
}
