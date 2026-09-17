import type {
  BorderRadius,
  FontSize,
  MessageSpacing,
  StylesConfig,
  ThemeColor,
} from "@/components/pages/playground/types";
import { DEFAULT_COLORS } from "@/components/pages/playground/types";

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

export function getThemeColor(
  color: ThemeColor | undefined,
  fallback: ThemeColor,
  mode: "light" | "dark",
): string {
  const value = color ?? fallback;
  return mode === "dark" ? value.dark : value.light;
}

export function generateThemeCssVars(
  styles: StylesConfig,
  mode: "light" | "dark",
): Record<string, string> {
  const { colors } = styles;
  const accentColor = getThemeColor(colors.accent, DEFAULT_COLORS.accent, mode);

  return {
    "--aui-accent": accentColor,
    "--aui-accent-foreground": isLightColor(accentColor)
      ? "#000000"
      : "#ffffff",
    "--aui-background": getThemeColor(
      colors.background,
      DEFAULT_COLORS.background,
      mode,
    ),
    "--aui-foreground": getThemeColor(
      colors.foreground,
      DEFAULT_COLORS.foreground,
      mode,
    ),
    "--aui-muted": getThemeColor(colors.muted, DEFAULT_COLORS.muted, mode),
    "--aui-muted-foreground": getThemeColor(
      colors.mutedForeground,
      DEFAULT_COLORS.mutedForeground,
      mode,
    ),
    "--aui-border": getThemeColor(colors.border, DEFAULT_COLORS.border, mode),
    "--aui-user-message": getThemeColor(
      colors.userMessage,
      DEFAULT_COLORS.userMessage,
      mode,
    ),
    "--aui-composer": colors.composer
      ? getThemeColor(colors.composer, DEFAULT_COLORS.composer, mode)
      : "color-mix(in oklab, var(--aui-muted) 30%, transparent)",
    "--aui-suggestion": getThemeColor(
      colors.suggestion,
      DEFAULT_COLORS.suggestion,
      mode,
    ),
    "--aui-suggestion-border": getThemeColor(
      colors.suggestionBorder,
      DEFAULT_COLORS.suggestionBorder,
      mode,
    ),
    "--aui-composer-border": colors.border
      ? "color-mix(in oklab, var(--aui-border) 60%, transparent)"
      : "color-mix(in oklab, var(--aui-foreground) 10%, transparent)",
    "--aui-composer-border-focus": colors.border
      ? "var(--aui-border)"
      : "color-mix(in oklab, var(--aui-foreground) 25%, transparent)",
    "--aui-edit-composer-border": colors.border
      ? "var(--aui-border)"
      : "color-mix(in oklab, var(--aui-foreground) 10%, transparent)",
    "--aui-suggestion-fill": colors.suggestion
      ? "var(--aui-suggestion)"
      : "transparent",
    "--aui-suggestion-outline": colors.suggestionBorder
      ? "var(--aui-suggestion-border)"
      : "transparent",
    "--aui-followup-border": colors.suggestionBorder
      ? "var(--aui-suggestion-border)"
      : "color-mix(in oklab, var(--aui-foreground) 10%, transparent)",
  };
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
