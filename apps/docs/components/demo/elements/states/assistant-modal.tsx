"use client";

import { useState } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { AssistantModal as AssistantModalElement } from "@/components/assistant-ui/elements/assistant-modal.aui";
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

function ClosedModal() {
  return (
    <SampleRuntimeProvider>
      <div className="bg-muted/40 relative h-full min-h-125 w-full overflow-hidden contain-[layout]">
        <AssistantModalElement />
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
