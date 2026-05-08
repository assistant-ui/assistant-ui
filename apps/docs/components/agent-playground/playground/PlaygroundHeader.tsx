import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/agent-playground/ui/button";
import type { PlaygroundHeaderState } from "./types";

function HeaderPortal({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      "[data-sub-project-header-portal]",
    );
    if (el) setContainer(el);
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}

export function PlaygroundHeader({
  onNewChat,
  onShowTemplates,
}: {
  headerState: PlaygroundHeaderState;
  debugOpen?: boolean | undefined;
  onToggleDebug?: (() => void) | undefined;
  onNewChat?: (() => void) | undefined;
  onShowTemplates?: (() => void) | undefined;
  onExportWorkspace?: (() => void | Promise<void>) | undefined;
  exportStatus?: string | undefined;
  exportError?: string | null | undefined;
}) {
  return (
    <HeaderPortal>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={onShowTemplates}
        >
          <LayoutGrid className="size-3.5" />
          <span className="hidden md:inline">Templates</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={onNewChat}
        >
          <Plus className="size-3.5" />
          <span className="hidden md:inline">New</span>
        </Button>
      </div>
    </HeaderPortal>
  );
}
