"use client";

import { useId, type ReactNode } from "react";
import registry from "@/registry/registry.json";
import { cn } from "@/lib/utils";

type CssVars = Partial<
  Record<"theme" | "light" | "dark", Record<string, string>>
>;
type CssRules = Record<string, Record<string, string>>;

const declarations = (vars: Record<string, string> | undefined) =>
  Object.entries(vars ?? {})
    .map(([name, value]) => `--${name}:${value};`)
    .join("");

const properties = (rule: Record<string, string>) =>
  Object.entries(rule)
    .map(([name, value]) => `${name}:${value};`)
    .join("");

/** A style rule's selectors, moved inside the scope. */
const scoped = (selectors: string, scope: string) =>
  selectors
    .split(/,\s*(?![^[]*\])/)
    .map((selector) => {
      const trimmed = selector.trim();
      if (trimmed.startsWith(":root.dark"))
        return `.dark ${scope}${trimmed.slice(":root.dark".length)}`;
      if (trimmed.startsWith(":root:not(.dark)"))
        return `:root:not(.dark) ${scope}${trimmed.slice(":root:not(.dark)".length)}`;
      if (trimmed.startsWith(":root"))
        return `${scope}${trimmed.slice(":root".length)}`;
      return `${scope} ${trimmed}`;
    })
    .join(",");

/**
 * Draws its children in a registry style, the way installing it would: its
 * variables, its fonts, its radii and its rules, kept inside this element.
 * The library compiles Tailwind's radius utilities to fixed values, so the
 * scope points the rounded utilities it knows back at the style's radii.
 */
export function RegistryStyleScope({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const item = registry.items.find(
    (entry) => entry.type === "registry:style" && entry.name === name,
  );
  // Without a style, it still renders its element, so switching styles
  // keeps the children mounted.
  const cssVars = (item && "cssVars" in item ? item.cssVars : {}) as CssVars;
  const css = (item && "css" in item ? item.css : {}) as CssRules;
  const scope = `[data-style-scope="${id}"]`;
  const theme = cssVars.theme ?? {};

  const fonts = declarations({
    ...(theme["font-sans"] && { "font-public-sans": theme["font-sans"] }),
    ...(theme["font-mono"] && { "font-jetbrains-mono": theme["font-mono"] }),
  });
  const radii = Object.keys(theme)
    .filter((key) => key.startsWith("radius-"))
    .map((key) => {
      const size = key.slice("radius-".length);
      return `${scope} .rounded-${size}{border-radius:var(--${key});}`;
    })
    .join("");
  const rules = Object.entries(css)
    .map(
      ([selectors, rule]) => `${scoped(selectors, scope)}{${properties(rule)}}`,
    )
    .join("");

  return (
    <div
      data-style-scope={id}
      className={cn("bg-background text-foreground font-sans", className)}
    >
      {item && (
        <style>
          {`${scope}{${declarations(theme)}${declarations(cssVars.light)}${fonts}}` +
            `.dark ${scope}{${declarations(cssVars.dark)}}${radii}${rules}`}
        </style>
      )}
      {children}
    </div>
  );
}
