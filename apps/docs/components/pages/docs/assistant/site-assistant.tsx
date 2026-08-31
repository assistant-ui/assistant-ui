"use client";

import type { ReactNode } from "react";
import { CurrentPageProvider } from "@/components/pages/docs/contexts/current-page";
import { AssistantPanelProvider } from "@/components/pages/docs/assistant/context";
import { DocsAssistantRuntimeProvider } from "@/runtimes/docs-assistant";
import { AskAiBall } from "@/components/pages/docs/assistant/ball";
import { AskAiWindow } from "@/components/pages/docs/assistant/window";

export function SiteAssistant({ children }: { children: ReactNode }) {
  return (
    <CurrentPageProvider>
      <AssistantPanelProvider>
        {children}
        <DocsAssistantRuntimeProvider>
          <AskAiWindow />
        </DocsAssistantRuntimeProvider>
        <AskAiBall />
      </AssistantPanelProvider>
    </CurrentPageProvider>
  );
}
