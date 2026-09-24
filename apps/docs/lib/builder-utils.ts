import type {
  BorderRadius,
  FontSize,
  MessageSpacing,
  StylesConfig,
} from "@/components/pages/playground/types";

export const BORDER_RADIUS_CLASS: Record<BorderRadius, string> = {
  none: "rounded-none",
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-3xl",
};

export const FONT_SIZE_CLASS: Record<FontSize, string> = {
  "13px": "text-[13px]",
  "14px": "text-sm",
  "15px": "text-[15px]",
  "16px": "text-base",
};

export const MESSAGE_SPACING_CLASS: Record<MessageSpacing, string> = {
  compact: "py-2",
  comfortable: "py-3",
  spacious: "py-5",
};

export const MESSAGE_GAP_CLASS: Record<MessageSpacing, string> = {
  compact: "gap-y-4",
  comfortable: "gap-y-6",
  spacious: "gap-y-8",
};

export const COMPOSER_RADIUS: Record<BorderRadius, string> = {
  none: "0",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  full: "1.5rem",
};

type ThemedColor = Exclude<keyof StylesConfig["colors"], "accent">;

const THEME_COLOR_VARS: Record<ThemedColor, string> = {
  background: "--aui-background",
  foreground: "--aui-foreground",
  muted: "--aui-muted",
  mutedForeground: "--aui-muted-foreground",
  border: "--aui-border",
  userMessage: "--aui-user-message",
  assistantMessage: "--aui-assistant-message",
  composer: "--aui-composer",
  userAvatar: "--aui-user-avatar",
  assistantAvatar: "--aui-assistant-avatar",
  suggestion: "--aui-suggestion",
  suggestionBorder: "--aui-suggestion-border",
};

export function generateThemeCssVars(
  styles: StylesConfig,
  mode: "light" | "dark",
): Record<string, string> {
  const { colors } = styles;
  const accentColor = colors.accent[mode];
  const vars: Record<string, string> = {
    "--aui-accent": accentColor,
    "--aui-accent-foreground": isLightColor(accentColor)
      ? "#000000"
      : "#ffffff",
  };
  for (const key of Object.keys(THEME_COLOR_VARS) as ThemedColor[]) {
    const color = colors[key];
    if (color) vars[THEME_COLOR_VARS[key]] = color[mode];
  }
  return vars;
}

export function generateThreadStyleVars(
  styles: StylesConfig,
): Record<string, string> {
  const { colors } = styles;
  return {
    ...(colors.background && { "--background": "var(--aui-background)" }),
    ...(colors.foreground && { "--foreground": "var(--aui-foreground)" }),
    ...(colors.muted && { "--muted": "var(--aui-muted)" }),
    ...(colors.mutedForeground && {
      "--muted-foreground": "var(--aui-muted-foreground)",
    }),
    ...(colors.border && { "--border": "var(--aui-border)" }),
    "--thread-max-width": styles.maxWidth,
    "--composer-radius": COMPOSER_RADIUS[styles.borderRadius] ?? "0.5rem",
    "--composer-padding": "8px",
    "--composer-bg": colors.composer
      ? "var(--aui-composer)"
      : "color-mix(in oklab, var(--muted) 30%, transparent)",
    "--accent-color": "var(--aui-accent)",
    "--accent-foreground": "var(--aui-accent-foreground)",
  };
}

export function generateThemeClasses(styles: StylesConfig) {
  const { colors } = styles;
  const hoverFill = colors.suggestion
    ? "hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--aui-suggestion))]"
    : "hover:bg-foreground/[0.03]";
  return {
    composerBorder: colors.border
      ? "border-[color-mix(in_oklab,var(--aui-border)_60%,transparent)] focus-within:border-(--aui-border)"
      : "border-foreground/10 focus-within:border-foreground/25",
    editComposerBorder: colors.border
      ? "border-(--aui-border)"
      : "border-foreground/10 focus-within:border-foreground/25",
    userMessage: colors.userMessage ? "bg-(--aui-user-message)" : "bg-muted",
    assistantMessage: colors.assistantMessage
      ? "rounded-2xl bg-(--aui-assistant-message) px-4 py-3"
      : "",
    userAvatar: colors.userAvatar ? "bg-(--aui-user-avatar)" : "bg-primary/10",
    assistantAvatar: colors.assistantAvatar
      ? "bg-(--aui-assistant-avatar)"
      : "bg-primary/10",
    suggestion: [
      colors.suggestion && "bg-(--aui-suggestion)",
      colors.suggestionBorder &&
        "inset-ring inset-ring-(--aui-suggestion-border)",
      hoverFill,
    ]
      .filter(Boolean)
      .join(" "),
    followUp: [
      colors.suggestionBorder
        ? "border-(--aui-suggestion-border)"
        : "border-foreground/10 hover:border-foreground/25",
      colors.suggestion && "bg-(--aui-suggestion)",
      hoverFill,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function indent(code: string, spaces: number): string {
  return code.replace(/\n(?=.)/g, `\n${" ".repeat(spaces)}`);
}

/**
 * Determines if a hex color is light (should use dark text) or dark (should use light text)
 */
export function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
