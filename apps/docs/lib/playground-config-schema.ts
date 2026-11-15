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

export const LOADING_TEXT_MAX_LENGTH = 80;
export const CUSTOM_CSS_MAX_LENGTH = 20_000;

// oxlint-disable-next-line no-control-regex -- matches control characters
const LOADING_TEXT_DISALLOWED = /[\u0000-\u001f\u007f\u2028\u2029]/g;

/** Drops what `loadingText` does not accept, for inputs that edit it. */
export const toLoadingText = (value: string) =>
  value.replace(LOADING_TEXT_DISALLOWED, "").slice(0, LOADING_TEXT_MAX_LENGTH);

const labelString = z
  .string()
  .max(LOADING_TEXT_MAX_LENGTH)
  .refine((value) => toLoadingText(value) === value, "Invalid text");

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
  customCSS: z
    .string()
    .max(CUSTOM_CSS_MAX_LENGTH)
    // Tabs and line breaks only, and no lone surrogates, so each character
    // encodes to at most 3 bytes and the config stays under the link limit.
    .refine(
      (value) =>
        // oxlint-disable-next-line no-control-regex -- rejects control characters
        !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) &&
        !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(
          value,
        ),
      "Invalid CSS",
    )
    .optional(),
});

export type PartialBuilderConfig = z.infer<typeof updateConfigSchema>;
