import { z } from "zod";

// Colors, lengths and font lists end up in generated TSX and CSS, so each
// string is limited to the characters those values need.
const colorString = z
  .string()
  .max(64)
  .regex(/^[#\w(),.% /+-]*$/, "Invalid color");

const lengthString = z
  .string()
  .max(40)
  .regex(/^[\w.%()+*/ ,-]*$/, "Invalid length");

const fontFamilyString = z
  .string()
  .max(200)
  .regex(/^[\w ,'".-]*$/, "Invalid font family");

const labelString = z
  .string()
  .max(80)
  // oxlint-disable-next-line no-control-regex -- rejects control characters
  .regex(/^[^\u0000-\u001f\u007f\u2028\u2029<>{}]*$/, "Invalid text");

const themeColorSchema = z
  .strictObject({
    light: colorString.optional(),
    dark: colorString.optional(),
  })
  .optional();

export const updateConfigSchema = z.strictObject({
  components: z
    .strictObject({
      attachments: z.boolean().optional(),
      branchPicker: z.boolean().optional(),
      editMessage: z.boolean().optional(),
      actionBar: z
        .strictObject({
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
      loadingText: labelString.optional(),
    })
    .optional(),
  styles: z
    .strictObject({
      theme: z.enum(["light", "dark", "system"]).optional(),
      colors: z
        .strictObject({
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
      maxWidth: lengthString.optional(),
      fontFamily: fontFamilyString.optional(),
      fontSize: z.enum(["13px", "14px", "15px", "16px"]).optional(),
      messageSpacing: z.enum(["compact", "comfortable", "spacious"]).optional(),
      userMessagePosition: z.enum(["right", "left"]).optional(),
      animations: z.boolean().optional(),
    })
    .optional(),
  customCSS: z.string().max(20_000).optional(),
});

export type PartialBuilderConfig = z.infer<typeof updateConfigSchema>;
