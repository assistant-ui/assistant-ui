"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import icon from "@/public/favicon/icon.svg";
import { Github, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TwShimmerLayoutClient({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [theme, setThemeState] = useState<string | null>(null);

  useEffect(() => {
    // Get initial theme from document
    const isDark = document.documentElement.classList.contains("dark");
    setThemeState(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setThemeState(newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-border/40 border-b border-dashed bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src={icon}
                alt="logo"
                className="size-5 dark:hue-rotate-180 dark:invert"
              />
              <span className="font-semibold">assistant-ui</span>
            </Link>
            <nav className="ml-4 flex items-center gap-2 text-sm">
              <span className="text-foreground/40">/</span>
              <Link
                href="/tw-shimmer"
                className="shimmer text-foreground/60 transition-colors hover:text-foreground"
              >
                tw-shimmer
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
              >
                <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Link
                href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/tw-shimmer"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/60 transition-colors hover:text-foreground"
              >
                <Github className="size-4" />
                <span className="sr-only">GitHub</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-dashed py-6 md:py-0">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between text-muted-foreground text-sm">
          <p>
            By{" "}
            <Link
              href="https://assistant-ui.com"
              className="underline underline-offset-4"
            >
              assistant-ui
            </Link>
            . Open source.
          </p>
        </div>
      </footer>
    </div>
  );
}
