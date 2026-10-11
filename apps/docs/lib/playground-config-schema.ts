import { z } from "zod";

const themeColorSchema = z
  .object({
    light: z.string().optional(),
    dark: z.string().optional(),
  })
  .optional();

export const updateConfigSchema = z.object({
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
