"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const RADIUS_PRESETS = [
  { label: "Square", value: "0px" },
  { label: "Rounded", value: "0.625rem" },
  { label: "Pill", value: "1rem" },
] as const;

export const ACCENT_PRESETS = [
  {
    label: "Graphite",
    swatch: "oklch(0.205 0 0)",
    light: { primary: "oklch(0.205 0 0)", ring: "oklch(0.708 0 0)" },
    dark: { primary: "oklch(0.922 0 0)", ring: "oklch(0.556 0 0)" },
  },
  {
    label: "Indigo",
    swatch: "oklch(0.5 0.19 264)",
    light: { primary: "oklch(0.5 0.19 264)", ring: "oklch(0.65 0.16 264)" },
    dark: { primary: "oklch(0.68 0.17 264)", ring: "oklch(0.55 0.15 264)" },
  },
  {
    label: "Emerald",
    swatch: "oklch(0.6 0.15 149)",
    light: { primary: "oklch(0.6 0.15 149)", ring: "oklch(0.7 0.14 149)" },
    dark: { primary: "oklch(0.7 0.15 149)", ring: "oklch(0.6 0.14 149)" },
  },
] as const;
export type AccentPreset = (typeof ACCENT_PRESETS)[number];

const PREVIEW_THEMES = ["light", "dark"] as const;
export type PreviewTheme = (typeof PREVIEW_THEMES)[number];

export type StyleControlsState = {
  radius: string;
  accent: AccentPreset;
  previewTheme: PreviewTheme;
};

export type StyleControlsProps = StyleControlsState & {
  onRadiusChange: (value: string) => void;
  onAccentChange: (value: AccentPreset) => void;
  onPreviewThemeChange: (value: PreviewTheme) => void;
  children: ReactNode;
};

export function StyleControls({
  radius,
  onRadiusChange,
  accent,
  onAccentChange,
  previewTheme,
  onPreviewThemeChange,
  children,
}: StyleControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <fieldset className="flex items-center gap-1.5">
          <legend className="sr-only">Radius</legend>
          {RADIUS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onRadiusChange(preset.value)}
              aria-pressed={radius === preset.value}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                radius === preset.value
                  ? "border-border bg-muted text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </fieldset>

        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Accent</legend>
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-label={preset.label}
              aria-pressed={accent.label === preset.label}
              onClick={() => onAccentChange(preset)}
              className={cn(
                "size-6 rounded-full border transition-shadow",
                accent.label === preset.label
                  ? "ring-ring ring-offset-background ring-2 ring-offset-2"
                  : "border-border/60",
              )}
              style={{ backgroundColor: preset.swatch }}
            />
          ))}
        </fieldset>

        <fieldset className="flex items-center gap-1.5">
          <legend className="sr-only">Preview theme</legend>
          {PREVIEW_THEMES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPreviewThemeChange(mode)}
              aria-pressed={previewTheme === mode}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs capitalize transition-colors",
                previewTheme === mode
                  ? "border-border bg-muted text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {mode}
            </button>
          ))}
        </fieldset>

        <p className="text-muted-foreground text-xs">
          This preview's theme is independent of the site theme toggle.
        </p>
      </div>

      <div
        className={cn(
          "bg-background text-foreground rounded-xl p-4",
          previewTheme === "dark" && "dark",
        )}
        style={
          {
            "--radius": radius,
            "--primary": accent[previewTheme].primary,
            "--ring": accent[previewTheme].ring,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
