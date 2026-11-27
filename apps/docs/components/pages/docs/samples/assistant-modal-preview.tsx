"use client";

import { AssistantModalSample } from "./assistant-modal";
import { SampleRuntimeProvider } from "./sample-runtime-provider";

/** The AssistantModal primitive page's preview. It runs on a demo runtime of its own, so a message sent from it never reaches the docs assistant. */
export function AssistantModalPreview() {
  return (
    <SampleRuntimeProvider>
      <AssistantModalSample />
    </SampleRuntimeProvider>
  );
}
