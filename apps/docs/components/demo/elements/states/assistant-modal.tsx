"use client";

import { useState } from "react";
import { BotIcon } from "lucide-react";
import {
  AssistantModalPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { AssistantModal } from "@/components/pages/docs/samples/assistant-modal";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { THREAD_FIXTURES } from "./thread";
import { defineStates } from "./types";

/** Layout containment makes the box the containing block for the modal's fixed anchor, as in the demo. */
function ModalStage({ messages }: { messages: ThreadMessageLike[] }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <SampleRuntimeProvider messages={messages}>
      <div className="bg-muted/40 relative h-full min-h-125 w-full overflow-hidden">
        <div
          ref={setContainer}
          className="[container-type:size] absolute inset-0 contain-[layout]"
        >
          {container && <AssistantModal container={container} />}
        </div>
      </div>
    </SampleRuntimeProvider>
  );
}

/**
 * The sample modal always opens on mount, so the closed state composes the
 * same primitives without `defaultOpen` and portals into the stage like the
 * other states do.
 */
function ClosedModal() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <SampleRuntimeProvider>
      <div className="bg-muted/40 relative h-full min-h-125 w-full overflow-hidden">
        <div
          ref={setContainer}
          className="[container-type:size] absolute inset-0 contain-[layout]"
        >
          <AssistantModalPrimitive.Root>
            <AssistantModalPrimitive.Anchor className="absolute end-4 bottom-4 size-11">
              <AssistantModalPrimitive.Trigger asChild>
                <TooltipIconButton
                  variant="ghost"
                  tooltip="Open Assistant"
                  side="left"
                  className="bg-background text-foreground border-border/60 hover:border-border hover:bg-background size-full rounded-full border"
                >
                  <BotIcon className="size-5" />
                </TooltipIconButton>
              </AssistantModalPrimitive.Trigger>
            </AssistantModalPrimitive.Anchor>
            {container && (
              <AssistantModalPrimitive.Content
                sideOffset={16}
                avoidCollisions={false}
                portalProps={{ container }}
                className="bg-popover text-popover-foreground ring-foreground/10 [&_.aui-thread-viewport-footer]:bg-popover z-50 flex h-100 max-h-[calc(100cqh_-_5.75rem)] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-clip rounded-xl p-0 ring-1 md:h-137.5 md:w-105 [&_.aui-thread-root]:bg-inherit"
              >
                <Thread />
              </AssistantModalPrimitive.Content>
            )}
          </AssistantModalPrimitive.Root>
        </div>
      </div>
    </SampleRuntimeProvider>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "closed",
    label: "Closed",
    note: "Only the launcher button shows until the user opens the modal.",
    Component: ClosedModal,
  },
  {
    key: "empty",
    label: "Empty",
    note: "A new chat opens on the welcome message and an empty composer.",
    Component: () => <ModalStage messages={THREAD_FIXTURES.empty} />,
  },
  {
    key: "streaming",
    label: "Streaming",
    note: "A reply is still arriving inside the open modal.",
    Component: () => <ModalStage messages={THREAD_FIXTURES.streaming} />,
  },
  {
    key: "error",
    label: "Error",
    note: "The run failed and the error shows under the partial reply.",
    Component: () => <ModalStage messages={THREAD_FIXTURES.error} />,
  },
]);
