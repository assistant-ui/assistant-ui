"use client";

import { useState } from "react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { DocumentPane } from "./document-pane";

const VIEWS = [
  { value: "document", label: "Document" },
  { value: "assistant", label: "Assistant" },
] as const;

type View = (typeof VIEWS)[number]["value"];

// Below the `@3xl` container width one panel is hidden, and the other fills the row.
const NARROW_VIEW: Record<View, string> = {
  document: "@max-3xl:[&>[data-panel]:last-of-type]:hidden!",
  assistant: "@max-3xl:[&>[data-panel]:first-of-type]:hidden!",
};

/**
 * The document beside the thread, with a handle to resize them. Both panels
 * show from the `@3xl` container width up; below it a switch shows one at a
 * time. Render it inside an `AssistantRuntimeProvider` and a
 * `DocumentStoreContext` provider.
 */
export function DocumentWorkspace({
  className,
}: {
  className?: string | undefined;
}) {
  const [view, setView] = useState<View>("document");

  return (
    <div
      data-slot="document-workspace"
      className={cn(
        "bg-background text-foreground @container flex h-full min-h-0 flex-col",
        className,
      )}
    >
      <div
        role="group"
        aria-label="View"
        className="flex gap-1 border-b p-2 @3xl:hidden"
      >
        {VIEWS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={view === value ? "secondary" : "ghost"}
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className="flex-1"
          >
            {label}
          </Button>
        ))}
      </div>
      <ResizablePanelGroup
        orientation="horizontal"
        className={cn("min-h-0 flex-1", NARROW_VIEW[view])}
      >
        <ResizablePanel defaultSize="62%" minSize="30%">
          <section aria-label="Document" className="h-full min-w-0">
            <DocumentPane />
          </section>
        </ResizablePanel>
        <ResizableHandle className="@max-3xl:hidden" />
        <ResizablePanel defaultSize="38%" minSize="25%">
          <aside aria-label="Assistant" className="h-full min-w-0">
            <Thread autoFocus={false} />
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
