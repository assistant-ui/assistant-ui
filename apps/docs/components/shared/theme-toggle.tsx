"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => void;
};

type Theme = "dark" | "light";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    if (!mounted) return;

    const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";

    const updateTheme = () => {
      setTheme(nextTheme);
    };

    const startViewTransition = (document as DocumentWithViewTransition)
      .startViewTransition;

    if (!startViewTransition) {
      runFallbackTransition(nextTheme, updateTheme);
      return;
    }

    startViewTransition.call(document, updateTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
      aria-label={
        mounted && resolvedTheme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
    >
      {mounted ? (
        resolvedTheme === "dark" ? (
          <Moon className="size-4" />
        ) : (
          <Sun className="size-4" />
        )
      ) : (
        <div className="size-4" />
      )}
    </button>
  );
}

const runFallbackTransition = (nextTheme: Theme, updateTheme: () => void) => {
  if (document.querySelector("[data-theme-toggle-fallback]")) return;

  const ripple = document.createElement("div");
  ripple.dataset.themeToggleFallback = "true";
  ripple.className = "theme-toggle-fallback-ripple";
  ripple.style.setProperty(
    "--theme-toggle-fallback-background",
    nextTheme === "dark" ? "oklch(0.145 0 0)" : "oklch(1 0 0)",
  );

  document.body.appendChild(ripple);
  window.setTimeout(updateTheme, 420);
  ripple.addEventListener("animationend", () => ripple.remove(), {
    once: true,
  });
};
