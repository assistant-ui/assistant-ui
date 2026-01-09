"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Moon, Sun } from "lucide-react";
import { Builder } from "@/components/builder/builder";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import { DEFAULT_CONFIG, type BuilderConfig } from "@/components/builder/types";

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  if (!mounted) {
    return <div className="size-7" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </button>
  );
}

export default function PlaygroundPage() {
  const [config, setConfig] = useState<BuilderConfig>(DEFAULT_CONFIG);

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="shrink-0">
        <div className="flex h-11 items-center justify-between px-5 text-sm">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="group flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Image
                src="/favicon/icon.svg"
                alt="logo"
                width={18}
                height={18}
                className="size-[18px] opacity-40 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0 dark:hue-rotate-180 dark:invert"
              />
              <span>assistant-ui</span>
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-foreground">playground</span>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="https://github.com/assistant-ui/assistant-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Github className="size-4" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <DocsRuntimeProvider>
          <Builder config={config} onChange={setConfig} />
        </DocsRuntimeProvider>
      </main>
    </div>
  );
}
