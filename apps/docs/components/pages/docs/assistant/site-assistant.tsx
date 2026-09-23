"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CurrentPageProvider } from "@/components/pages/docs/contexts/current-page";
import { AssistantPanelProvider } from "@/components/pages/docs/assistant/context";
import { DocsAssistantRuntimeProvider } from "@/runtimes/docs-assistant";
import { AskAiBall } from "@/components/pages/docs/assistant/ball";
import { AskAiWindow } from "@/components/pages/docs/assistant/window";

export function SiteAssistant({ children }: { children: ReactNode }) {
  const isSetup = usePathname() === "/shop/setup";
  return (
    <CurrentPageProvider>
      <AssistantPanelProvider>
        {children}
        {!isSetup ? (
          <>
            <DocsAssistantRuntimeProvider>
              <AskAiWindow />
            </DocsAssistantRuntimeProvider>
            <AskAiBall />
          </>
        ) : null}
      </AssistantPanelProvider>
    </CurrentPageProvider>
  );
}
