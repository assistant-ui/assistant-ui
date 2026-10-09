"use client";

import type { Toolkit } from "@assistant-ui/react";
import { Settings2 } from "lucide-react";
import {
  type PartialBuilderConfig,
  updateConfigSchema,
} from "./playground-config-schema";

export type { PartialBuilderConfig } from "./playground-config-schema";

export function createPlaygroundChatToolkit(
  onConfigUpdate: (update: PartialBuilderConfig) => void,
): Toolkit {
  return {
    update_config: {
      type: "frontend" as const,
      description:
        "Update the playground's BuilderConfig. Only include the fields you want to change.",
      parameters: updateConfigSchema,
      execute: async (args: PartialBuilderConfig) => {
        onConfigUpdate(args);
        const changedSections = Object.keys(args).join(", ");
        return { success: true, changed: changedSections };
      },
      render: ({ args, status }) => {
        const isRunning = status?.type === "running";
        const sections = Object.keys(args ?? {});
        return (
          <div className="border-border/60 bg-muted/30 text-muted-foreground my-1.5 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
            <Settings2 className="size-3" />
            <span className="flex-1 truncate">
              {isRunning ? "Updating" : "Updated"}{" "}
              {sections.length > 0 ? sections.join(", ") : "config"}
            </span>
          </div>
        );
      },
    },
  };
}
