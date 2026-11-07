"use client";

import { SparklesIcon, Trash2Icon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "disabled",
    label: "Disabled",
    note: "A disabled button dims and ignores clicks.",
    Component: () => (
      <div className="flex items-center gap-3">
        <TooltipIconButton tooltip="Generate" variant="outline">
          <SparklesIcon />
        </TooltipIconButton>
        <TooltipIconButton tooltip="Generate" variant="outline" disabled>
          <SparklesIcon />
        </TooltipIconButton>
      </div>
    ),
  },
  {
    key: "destructive",
    label: "Destructive",
    note: "The destructive variant marks an action that removes something.",
    Component: () => (
      <TooltipIconButton tooltip="Delete thread" variant="destructive">
        <Trash2Icon />
      </TooltipIconButton>
    ),
  },
]);
