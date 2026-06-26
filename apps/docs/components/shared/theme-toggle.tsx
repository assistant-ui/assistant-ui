"use client";

import type { MutableRefObject } from "react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => void;
};

type Theme = "dark" | "light";

const FALLBACK_REVEAL_DELAY_MS = 420;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const themeRef = useRef<Theme>("light");
  const fallbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    themeRef.current = resolvedTheme === "dark" ? "dark" : "light";
  }, [resolvedTheme]);

  useEffect(() => {
    return () => clearFallbackTransition(fallbackTimeoutRef);
  }, []);

  const toggleTheme = () => {
    if (!mounted) return;

    const nextTheme: Theme = themeRef.current === "dark" ? "light" : "dark";
    themeRef.current = nextTheme;

    const updateTheme = () => {
      setTheme(nextTheme);
    };

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      clearFallbackTransition(fallbackTimeoutRef);
      updateTheme();
      return;
    }

    const doc = document as DocumentWithViewTransition;

    if (doc.startViewTransition) doc.startViewTransition(updateTheme);
    else runFallbackTransition(nextTheme, updateTheme, fallbackTimeoutRef);
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

const clearFallbackTransition = (
  fallbackTimeoutRef: MutableRefObject<number | null>,
) => {
  if (fallbackTimeoutRef.current !== null) {
    window.clearTimeout(fallbackTimeoutRef.current);
    fallbackTimeoutRef.current = null;
  }

  document
    .querySelectorAll("[data-theme-toggle-fallback]")
    .forEach((element) => element.remove());
};

const runFallbackTransition = (
  nextTheme: Theme,
  updateTheme: () => void,
  fallbackTimeoutRef: MutableRefObject<number | null>,
) => {
  clearFallbackTransition(fallbackTimeoutRef);

  const ripple = document.createElement("div");
  ripple.dataset.themeToggleFallback = "true";
  ripple.className = "theme-toggle-fallback-ripple";
  ripple.style.setProperty(
    "--theme-toggle-fallback-background",
    nextTheme === "dark" ? "oklch(0.145 0 0)" : "oklch(1 0 0)",
  );

  document.body.appendChild(ripple);
  fallbackTimeoutRef.current = window.setTimeout(() => {
    fallbackTimeoutRef.current = null;
    updateTheme();
  }, FALLBACK_REVEAL_DELAY_MS);
  ripple.addEventListener("animationend", () => ripple.remove(), {
    once: true,
  });
};
