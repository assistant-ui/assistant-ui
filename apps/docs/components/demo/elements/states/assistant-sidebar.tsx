"use client";

import type { ThreadMessageLike } from "@assistant-ui/react";
import { BotIcon } from "lucide-react";
import { AssistantSidebar } from "@/components/assistant-ui/elements/assistant-sidebar.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { THREAD_FIXTURES } from "./thread";
import { defineStates } from "./types";

function SidebarFixture({ messages }: { messages: ThreadMessageLike[] }) {
  return (
    <SampleRuntimeProvider messages={messages}>
      <div className="bg-background h-full min-h-125 w-full overflow-hidden">
        <AssistantSidebar>
          <div className="bg-muted/30 flex h-full items-center justify-center p-6 text-center">
            <div>
              <BotIcon className="text-foreground/35 mx-auto size-6" />
              <p className="mt-3 text-sm font-medium">Workspace</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Resize the assistant beside your app.
              </p>
            </div>
          </div>
        </AssistantSidebar>
      </div>
    </SampleRuntimeProvider>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty",
    note: "The panel opens on a new chat with no messages.",
    Component: () => <SidebarFixture messages={THREAD_FIXTURES.empty} />,
  },
  {
    key: "streaming",
    label: "Streaming",
    note: "A reply is still arriving in the side panel.",
    Component: () => <SidebarFixture messages={THREAD_FIXTURES.streaming} />,
  },
  {
    key: "error",
    label: "Error",
    note: "The run failed and the panel shows the provider error.",
    Component: () => <SidebarFixture messages={THREAD_FIXTURES.error} />,
  },
  {
    key: "long-content",
    label: "Long thread",
    note: "A multi-turn thread with code scrolls inside the narrow panel.",
    Component: () => <SidebarFixture messages={THREAD_FIXTURES.long} />,
  },
]);
