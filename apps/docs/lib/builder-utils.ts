import type {
  BorderRadius,
  FontSize,
  MessageSpacing,
} from "@/components/builder/types";

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
