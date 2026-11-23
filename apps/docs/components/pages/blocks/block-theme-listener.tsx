"use client";

import { useEffect } from "react";

const PROPERTIES = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--radius",
  "font-family",
  "font-size",
];

type ThemeMessage = {
  type?: unknown;
  mode?: unknown;
  style?: Record<string, unknown>;
};

/**
 * Applies the theme the block viewer posts to a framed demo. The mode is set
 * on the element directly, because the site's theme setting is shared with
 * the page that frames this one.
 */
export function BlockThemeListener() {
  useEffect(() => {
    const root = document.documentElement;
    const initialClasses = ["dark", "light"].map(
      (name) => [name, root.classList.contains(name)] as const,
    );
    const initialStyles = [root, document.body].map(
      (element) => [element, element.getAttribute("style")] as const,
    );
    const setMode = (mode: unknown) => {
      if (mode !== "dark" && mode !== "light") return;
      root.classList.toggle("dark", mode === "dark");
      root.classList.toggle("light", mode === "light");
      root.style.colorScheme = mode;
    };

    const frame = requestAnimationFrame(() =>
      setMode(new URLSearchParams(window.location.search).get("theme")),
    );
    const onMessage = (event: MessageEvent<ThemeMessage | null>) => {
      const data = event.data;
      if (
        event.source !== window.parent ||
        event.origin !== window.location.origin ||
        data?.type !== "aui-block-theme"
      )
        return;
      setMode(data.mode);
      // A block sets its own font on the body and on its root element.
      const fontTargets = [
        document.body,
        ...document.querySelectorAll<HTMLElement>("[data-block-preview] > *"),
      ];
      for (const property of PROPERTIES) {
        const value = data.style?.[property];
        const targets =
          property === "font-family" ? [root, ...fontTargets] : [root];
        for (const target of targets) {
          if (typeof value === "string" && value)
            target.style.setProperty(property, value);
          else target.style.removeProperty(property);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("message", onMessage);
      for (const [name, present] of initialClasses)
        root.classList.toggle(name, present);
      for (const [element, style] of initialStyles) {
        if (style === null) element.removeAttribute("style");
        else element.setAttribute("style", style);
      }
    };
  }, []);

  return null;
}
