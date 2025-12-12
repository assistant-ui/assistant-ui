"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  Moon,
  Sun,
  ExternalLink,
  ArrowRight,
  Search,
} from "lucide-react";
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SearchDialog } from "./search-dialog";

const NAV_LINKS = [
  { label: "Docs", href: "/docs/getting-started" },
  { label: "Showcase", href: "/showcase" },
  { label: "Examples", href: "/examples" },
  { label: "Pricing", href: "/pricing" },
] as const;

const EXTERNAL_LINKS = [
  { label: "Dashboard", href: "https://cloud.assistant-ui.com/" },
] as const;

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 127.14 96.36"
      className={className}
    >
      <path
        fill="currentColor"
        d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
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
    return <div className="size-8" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
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

function SearchButton({ onToggle }: { onToggle: () => void }) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }
    };
    document.addEventListener("keydown", down, true);
    return () => document.removeEventListener("keydown", down, true);
  }, [onToggle]);

  return (
    <button
      onClick={onToggle}
      className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Search (⌘K)"
    >
      <Search className="size-4" />
    </button>
  );
}

function HiringBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative">
      <div className="container mx-auto flex h-8 items-center justify-center px-4 md:px-20">
        <Link
          href="/careers"
          className="group inline-flex items-center gap-1.5 text-xs"
        >
          <span className="shimmer text-muted-foreground transition-colors group-hover:text-foreground">
            We're hiring. Build the future of agentic UI.
          </span>
          <ArrowRight className="size-3 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
        <button
          type="button"
          aria-label="Dismiss hiring banner"
          onClick={onDismiss}
          className="absolute right-4 text-muted-foreground transition-colors hover:text-foreground md:right-20"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const [dismissed, setDismissed] = usePersistentBoolean(
    "homepage-hiring-banner-dismissed",
  );

  const showBanner = pathname === "/" && !dismissed;

  return (
    <header className="sticky top-0 z-50 w-full">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-background via-background/80 to-transparent backdrop-blur-xl",
          showBanner
            ? "mask-[linear-gradient(to_bottom,black_55%,transparent)] dark:mask-[linear-gradient(to_bottom,black_50%,transparent)] h-36 via-65% dark:h-40 dark:via-60%"
            : "mask-[linear-gradient(to_bottom,black_50%,transparent)] dark:mask-[linear-gradient(to_bottom,black_40%,transparent)] h-24 via-60% dark:h-28 dark:via-50%",
        )}
      />
      <div className="container relative mx-auto flex h-12 items-center justify-between px-4 md:px-20">
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

        <nav className="hidden items-center md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {EXTERNAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              {link.label}
              <ExternalLink className="size-3 opacity-40" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <SearchButton onToggle={() => setSearchOpen((prev) => !prev)} />
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

          <a
            href="https://github.com/assistant-ui/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground sm:flex"
            aria-label="GitHub"
          >
            <GitHubIcon className="size-4" />
          </a>

          <a
            href="https://discord.gg/S9dwgCNEFs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground sm:flex"
            aria-label="Discord"
          >
            <DiscordIcon className="size-4" />
          </a>

          <ThemeToggle />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden transition-all duration-200 md:hidden",
          mobileMenuOpen ? "max-h-80" : "max-h-0",
        )}
      >
        <nav className="container mx-auto flex flex-col px-4 pb-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {EXTERNAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              {link.label}
              <ExternalLink className="size-3 opacity-40" />
            </a>
          ))}
          <a
            href="https://github.com/assistant-ui/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <GitHubIcon className="size-4" />
            GitHub
          </a>
          <a
            href="https://discord.gg/S9dwgCNEFs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <DiscordIcon className="size-4" />
            Discord
          </a>
        </nav>
      </div>

      {showBanner && <HiringBanner onDismiss={() => setDismissed(true)} />}
    </header>
  );
}
