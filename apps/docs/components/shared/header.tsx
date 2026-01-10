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
import { GitHubIcon } from "@/components/icons/github";
import { DiscordIcon } from "@/components/icons/discord";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type DropdownItem = {
  label: string;
  href: string;
  description: string;
  external: boolean;
};

type NavItem =
  | { type: "link"; label: string; href: string }
  | { type: "dropdown"; label: string; items: DropdownItem[] };

const NAV_ITEMS: NavItem[] = [
  { type: "link", label: "Docs", href: "/docs/getting-started" },
  { type: "link", label: "Showcase", href: "/showcase" },
  { type: "link", label: "Examples", href: "/examples" },
  { type: "link", label: "Playground", href: "/playground" },
  {
    type: "dropdown",
    label: "Products",
    items: [
      {
        label: "Dashboard",
        href: "https://cloud.assistant-ui.com/",
        description: "Manage your cloud projects",
        external: true,
      },
      {
        label: "Tool UI",
        href: "https://tool-ui.com/",
        description: "Build tool UIs for AI agents",
        external: true,
      },
      {
        label: "tw-shimmer",
        href: "/tw-shimmer",
        description: "Tailwind CSS shimmer effects",
        external: false,
      },
      {
        label: "Safe Content Frame",
        href: "/safe-content-frame",
        description: "Secure sandboxed iframes",
        external: false,
      },
      {
        label: "ChatGPT App Studio",
        href: "/chatgpt-app-studio",
        description: "Build ChatGPT apps",
        external: false,
      },
    ],
  },
  {
    type: "dropdown",
    label: "Resources",
    items: [
      {
        label: "Blog",
        href: "/blog",
        description: "Latest news and updates",
        external: false,
      },
      {
        label: "Careers",
        href: "/careers",
        description: "Join our team",
        external: false,
      },
    ],
  },
  { type: "link", label: "Pricing", href: "/pricing" },
];

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
      <div className="mx-auto flex h-8 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <div className="w-8" />
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
          className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
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
            ? "mask-[linear-gradient(to_bottom,black_55%,transparent)] dark:mask-[linear-gradient(to_bottom,black_50%,transparent)] h-30 via-65% dark:via-60%"
            : "mask-[linear-gradient(to_bottom,black_50%,transparent)] dark:mask-[linear-gradient(to_bottom,black_40%,transparent)] h-24 via-60% dark:via-50%",
        )}
      />
      <div className="relative mx-auto flex h-12 w-full max-w-7xl items-center justify-between px-4 md:px-8">
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
          {NAV_ITEMS.map((item) =>
            item.type === "link" ? (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <HoverCard key={item.label} openDelay={100} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button className="px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground">
                    {item.label}
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-56 rounded-xl p-2 shadow-xs">
                  <div className="flex flex-col">
                    {item.items.map((link) =>
                      link.external ? (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                        >
                          <span className="flex items-center gap-1.5 text-sm">
                            {link.label}
                            <ExternalLink className="size-3 opacity-40" />
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {link.description}
                          </span>
                        </a>
                      ) : (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                        >
                          <span className="text-sm">{link.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {link.description}
                          </span>
                        </Link>
                      ),
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            ),
          )}
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
          "fixed inset-x-0 top-12 bottom-0 z-40 bg-background transition-opacity duration-200 md:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <nav className="flex h-full flex-col gap-1 overflow-y-auto px-4 pt-4">
          {NAV_ITEMS.map((item) =>
            item.type === "link" ? (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-foreground text-lg transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <div key={item.label} className="flex flex-col">
                <span className="py-3 text-muted-foreground text-sm">
                  {item.label}
                </span>
                {item.items.map((link) =>
                  link.external ? (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-1.5 py-2 pl-4 text-foreground text-lg transition-colors"
                    >
                      {link.label}
                      <ExternalLink className="size-3.5 opacity-40" />
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2 pl-4 text-foreground text-lg transition-colors"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            ),
          )}

          <div className="mt-auto flex gap-4 border-t py-6">
            <a
              href="https://github.com/assistant-ui/assistant-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <GitHubIcon className="size-5" />
            </a>
            <a
              href="https://discord.gg/S9dwgCNEFs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <DiscordIcon className="size-5" />
            </a>
          </div>
        </nav>
      </div>

      {showBanner && <HiringBanner onDismiss={() => setDismissed(true)} />}
    </header>
  );
}
