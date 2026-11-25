"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { ElementDemo } from "@/components/pages/elements/element-demos";
import {
  getLibraryTheme,
  themeVars,
  type ThemeOverrides,
  type ThemeSettings,
} from "@/lib/library/themes";
import { cn } from "@/lib/utils";
import { THEME_FONT_FAMILIES } from "./theme-fonts";

const declarations = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([name, value]) => `--${name}:${value};`)
    .join("");

const SWATCHES = [
  "background",
  "foreground",
  "primary",
  "secondary",
  "muted",
  "accent",
  "border",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

/** The font a theme gives its headings: its own, or the body's. */
export const themeHeadingFamily = (settings: ThemeSettings) =>
  THEME_FONT_FAMILIES[
    settings.fontHeading === "inherit" ? settings.font : settings.fontHeading
  ];

/**
 * Draws its children in a theme's colors and body font, in both color modes.
 * It cannot give them a preset's component style, icons, or radius: the
 * library draws the kit's own components, which fix those.
 */
export function ThemeScope({
  settings,
  overrides,
  className,
  children,
}: {
  settings: ThemeSettings;
  overrides?: ThemeOverrides | undefined;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const scope = `[data-theme-scope="${id}"]`;
  const vars = (mode: "light" | "dark") =>
    declarations({ ...themeVars(settings, mode), ...overrides?.[mode] });

  return (
    <div
      data-theme-scope={id}
      // `font-sans` reads this variable, so the theme's font reaches the children.
      style={
        {
          "--font-public-sans": THEME_FONT_FAMILIES[settings.font],
        } as CSSProperties
      }
      className={cn("bg-background text-foreground font-sans", className)}
    >
      <style>
        {`${scope}{${vars("light")}}.dark ${scope}{${vars("dark")}}`}
      </style>
      {children}
    </div>
  );
}

export function ThemeSwatches({ className }: { className?: string }) {
  return (
    <ul
      role="list"
      aria-label="Theme colors"
      className={cn("border-border flex h-7 shrink-0 border-t", className)}
    >
      {SWATCHES.map((name) => (
        <li
          key={name}
          title={name}
          className="flex-1"
          style={{ background: `var(--${name})` }}
        >
          <span className="sr-only">{name}</span>
        </li>
      ))}
    </ul>
  );
}

/** A theme's card: a chat in its colors and font, over the colors themselves. */
export function ThemePreview({ slug }: { slug: string }) {
  const theme = getLibraryTheme(slug);
  if (!theme) return null;

  return (
    <ThemeScope
      settings={theme.settings}
      overrides={theme.overrides}
      className="flex size-full min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-5">
        <ElementDemo demo="message-pair" />
      </div>
      <ThemeSwatches />
    </ThemeScope>
  );
}
