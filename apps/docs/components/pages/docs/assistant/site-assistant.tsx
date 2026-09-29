"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CurrentPageProvider } from "@/components/pages/docs/contexts/current-page";
import { AssistantPanelProvider } from "@/components/pages/docs/assistant/context";
import { DocsAssistantRuntimeProvider } from "@/runtimes/docs-assistant";
import { AskAiBall } from "@/components/pages/docs/assistant/ball";
import { AskAiWindow } from "@/components/pages/docs/assistant/window";
import { RENDERER_PATH } from "@/lib/renderer";

export function SiteAssistant({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hidden = pathname === "/shop/setup" || pathname === RENDERER_PATH;
  return (
    <CurrentPageProvider>
      <AssistantPanelProvider>
        {children}
        {!hidden ? (
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
