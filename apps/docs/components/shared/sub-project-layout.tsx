"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Moon, Sun } from "lucide-react";

interface SubProjectLayoutProps {
  name: string;
  githubPath: string;
  shimmerTitle?: boolean;
  children: ReactNode;
}

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
    return <div className="size-9" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
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

export function SubProjectLayout({
  name,
  githubPath,
  shimmerTitle,
  children,
}: SubProjectLayoutProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-border/40 border-b border-dashed bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 md:px-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/favicon/icon.svg"
                alt="assistant-ui logo"
                width={18}
                height={18}
                className="dark:hue-rotate-180 dark:invert"
              />
              <span className="font-medium tracking-tight">assistant-ui</span>
            </Link>
            <span className="ml-3 text-muted-foreground/40">/</span>
            <Link
              href={`/${name}`}
              className={`ml-3 text-muted-foreground text-sm transition-colors hover:text-foreground ${shimmerTitle ? "shimmer" : ""}`}
            >
              {name}
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <a
              href={githubPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="size-4" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-dashed py-6 md:py-0">
        <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 text-muted-foreground text-sm md:px-20">
          <p>
            By{" "}
            <Link
              href="https://assistant-ui.com"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
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
