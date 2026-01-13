"use client";

import { Layers } from "lucide-react";
import { useSelectedComponent } from "@/lib/workbench/store";
import { workbenchComponents } from "@/lib/workbench/component-registry";

export function ContextIndicator() {
  const selectedComponentId = useSelectedComponent();
  const component = workbenchComponents.find(
    (c) => c.id === selectedComponentId,
  );

  if (!component) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-border/50 border-t px-4 py-2">
      <Layers className="size-3.5 text-muted-foreground" />
      <span className="text-muted-foreground text-xs">
        Inspecting:{" "}
        <span className="font-medium text-foreground">{component.label}</span>
      </span>
    </div>
  );
}
