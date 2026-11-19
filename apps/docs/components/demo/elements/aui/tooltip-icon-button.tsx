"use client";

import { Code2Icon, FileTextIcon, SparklesIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { DemoSurface } from "./surface";

export function AuiTooltipIconButtonDemo() {
  return (
    <DemoSurface>
      <div className="flex items-center gap-3">
        <TooltipIconButton tooltip="Generate" variant="outline">
          <SparklesIcon />
        </TooltipIconButton>
        <TooltipIconButton tooltip="View code" variant="outline">
          <Code2Icon />
        </TooltipIconButton>
        <TooltipIconButton tooltip="Open file" variant="outline">
          <FileTextIcon />
        </TooltipIconButton>
      </div>
    </DemoSurface>
  );
}
