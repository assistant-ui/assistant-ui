"use client";

import type { Toolkit } from "@assistant-ui/react";
import { Settings2 } from "lucide-react";
import { z } from "zod";

const themeColorSchema = z
  .object({
    light: z.string().optional(),
    dark: z.string().optional(),
  })
  .optional();

const updateConfigSchema = z.object({
  components: z
    .object({
      attachments: z.boolean().optional(),
      branchPicker: z.boolean().optional(),
      editMessage: z.boolean().optional(),
      actionBar: z
        .object({
          copy: z.boolean().optional(),
          reload: z.boolean().optional(),
          speak: z.boolean().optional(),
          feedback: z.boolean().optional(),
        })
        .optional(),
      threadWelcome: z.boolean().optional(),
      suggestions: z.boolean().optional(),
      scrollToBottom: z.boolean().optional(),
      markdown: z.boolean().optional(),
      codeHighlightTheme: z
        .enum([
          "none",
          "github",
          "vitesse",
          "tokyo-night",
          "one-dark-pro",
          "dracula",
        ])
        .optional(),
      reasoning: z.boolean().optional(),
      sources: z.boolean().optional(),
      followUpSuggestions: z.boolean().optional(),
      avatar: z.boolean().optional(),
      typingIndicator: z.enum(["none", "dot"]).optional(),
      loadingIndicator: z.enum(["none", "spinner", "text"]).optional(),
      loadingText: z.string().optional(),
    })
    .optional(),
  styles: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      colors: z
        .object({
          accent: themeColorSchema,
          background: themeColorSchema,
          foreground: themeColorSchema,
          muted: themeColorSchema,
          mutedForeground: themeColorSchema,
          border: themeColorSchema,
          userMessage: themeColorSchema,
          assistantMessage: themeColorSchema,
          composer: themeColorSchema,
          userAvatar: themeColorSchema,
          assistantAvatar: themeColorSchema,
          suggestion: themeColorSchema,
          suggestionBorder: themeColorSchema,
        })
        .optional(),
      borderRadius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
      maxWidth: z.string().optional(),
      fontFamily: z.string().optional(),
      fontSize: z.enum(["13px", "14px", "15px", "16px"]).optional(),
      messageSpacing: z.enum(["compact", "comfortable", "spacious"]).optional(),
      userMessagePosition: z.enum(["right", "left"]).optional(),
      animations: z.boolean().optional(),
    })
    .optional(),
  customCSS: z.string().optional(),
});

export type PartialBuilderConfig = z.infer<typeof updateConfigSchema>;

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
          <div className="my-1.5 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground text-xs">
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
