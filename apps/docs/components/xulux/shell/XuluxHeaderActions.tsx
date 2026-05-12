"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

function HeaderPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(
      document.querySelector<HTMLElement>("[data-sub-project-header-portal]"),
    );
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}

export function XuluxHeaderActions({
  visible,
  onNewChat,
  onShowTemplates,
}: {
  visible: boolean;
  onNewChat: () => void;
  onShowTemplates: () => void;
}) {
  if (!visible) return null;

  return (
    <HeaderPortal>
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
    </HeaderPortal>
  );
}
