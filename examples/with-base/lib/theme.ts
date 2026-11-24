"use client";

import { useSyncExternalStore } from "react";
import {
  CUSTOM_THEME_COOKIE,
  CUSTOM_THEME_STYLE_ID,
  NO_CUSTOM_THEME,
  THEME_CLASSES,
  customThemeClasses,
  customThemeCss,
  isCustomThemeEmpty,
  parseCustomTheme,
  type CustomTheme,
} from "@/lib/custom-theme";
import { THEME_COOKIE, type Theme } from "@/lib/guest";

/*
 * The page is dark when it carries `.dark`, light when it carries `.light`,
 * and follows the system when it carries neither. A choice sets the class and
 * is remembered in a cookie, which the layout reads to render the next visit
 * in the same theme. Choosing the system clears both.
 */

export type ThemeChoice = Theme | "system";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => {
    query.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

function getChoice(): ThemeChoice {
  const classes = document.documentElement.classList;
  if (classes.contains("dark")) return "dark";
  if (classes.contains("light")) return "light";
  return "system";
}

function getDark() {
  const choice = getChoice();
  return choice === "system"
    ? window.matchMedia(DARK_QUERY).matches
    : choice === "dark";
}

export function setTheme(choice: ThemeChoice) {
  const classes = document.documentElement.classList;
  classes.toggle("dark", choice === "dark");
  classes.toggle("light", choice === "light");
  document.cookie =
    choice === "system"
      ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
      : `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
}

/** The theme that was chosen, and whether the page is dark right now. */
export function useTheme() {
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribe,
    getChoice,
    () => "system",
  );
  const dark = useSyncExternalStore(subscribe, getDark, () => false);
  return { choice, dark };
}

/* -------------------------------------------------------------------------- */
/* The colors a person has changed                                            */
/* -------------------------------------------------------------------------- */

let customTheme: CustomTheme | undefined;
const customThemeListeners = new Set<() => void>();

function readCookie(name: string) {
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

function getCustomTheme() {
  customTheme ??= parseCustomTheme(readCookie(CUSTOM_THEME_COOKIE));
  return customTheme;
}

function subscribeToCustomTheme(onChange: () => void) {
  customThemeListeners.add(onChange);
  return () => {
    customThemeListeners.delete(onChange);
  };
}

/** Applies the theme at once and remembers it for the next visit. */
export function setCustomTheme(next: CustomTheme) {
  customTheme = next;
  document.cookie = isCustomThemeEmpty(next)
    ? `${CUSTOM_THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
    : `${CUSTOM_THEME_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; samesite=lax`;

  let style = document.getElementById(CUSTOM_THEME_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = CUSTOM_THEME_STYLE_ID;
    document.head.append(style);
  }
  style.textContent = customThemeCss(next);

  const wanted = customThemeClasses(next);
  for (const name of THEME_CLASSES)
    document.documentElement.classList.toggle(name, wanted.includes(name));

  for (const listener of customThemeListeners) listener();
}

export function useCustomTheme() {
  return useSyncExternalStore(
    subscribeToCustomTheme,
    getCustomTheme,
    () => NO_CUSTOM_THEME,
  );
}

/*
 * What a CSS color, such as `var(--muted)`, comes to on the page right now,
 * as `#rrggbb`. The browser resolves the variable and its color space; a 1px
 * canvas turns the result into sRGB.
 */
export function resolveCssColor(color: string) {
  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = computed;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}
