"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantShellHeader,
  AssistantShellMain,
  AssistantShellRoot,
  AssistantShellSidebar,
} from "@/components/assistant-ui/assistant-shell";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function AssistantShellSample() {
  return (
    <SampleFrame className="h-100 overflow-hidden md:h-150">
      <AssistantShellRoot className="h-full">
        <AssistantShellSidebar />
        <AssistantShellMain>
          <AssistantShellHeader />
          <main className="flex-1 overflow-hidden">
            <Thread />
          </main>
        </AssistantShellMain>
      </AssistantShellRoot>
    </SampleFrame>
  );
}
