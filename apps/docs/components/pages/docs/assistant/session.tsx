"use client";

import { DocsAssistantRuntimeProvider } from "@/runtimes/docs-assistant";
import { AssistantThread } from "./thread";

export default function AssistantSession({ open }: { open: boolean }) {
  return (
    <DocsAssistantRuntimeProvider>
      {open ? <AssistantThread /> : null}
    </DocsAssistantRuntimeProvider>
  );
}
