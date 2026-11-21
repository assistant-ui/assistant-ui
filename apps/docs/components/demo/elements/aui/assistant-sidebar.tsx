"use client";

import { BotIcon } from "lucide-react";
import { AssistantSidebar } from "@/components/assistant-ui/elements/assistant-sidebar.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { DemoSurface } from "./surface";

export function AuiAssistantSidebarDemo() {
  return (
    <SampleRuntimeProvider>
      <DemoSurface className="bg-background">
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
      </DemoSurface>
    </SampleRuntimeProvider>
  );
}
