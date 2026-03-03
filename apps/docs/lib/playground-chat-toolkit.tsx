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
      render: ({ args }) => {
        const sections = Object.keys(args ?? {});
        return (
          <div className="my-2 flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm">
              <Settings2 className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium text-sm">
                Configuration updated
              </span>
              {sections.length > 0 && (
                <span className="truncate text-muted-foreground text-xs">
                  Changed: {sections.join(", ")}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
  };
}
