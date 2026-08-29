"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useEffect, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { SearchProvider } from "@/components/shared/search-provider";
import { WebMcpTools } from "@/components/shared/webmcp-tools";
import { Toaster } from "@/components/ui/sonner";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest('[role="dialog"]') !== null;
}

function ThemeHotkey() {
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "d") return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      const next = resolvedTheme === "dark" ? "light" : "dark";
      if (document.startViewTransition) {
        document.startViewTransition(() => flushSync(() => setTheme(next)));
      } else {
        setTheme(next);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolvedTheme, setTheme]);

  return null;
}

export function Provider({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeHotkey />
        <SearchProvider>{children}</SearchProvider>
      </ThemeProvider>

      <WebMcpTools />

      <Toaster position="top-center" />
    </NuqsAdapter>
  );
}
