"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowUpRight, ArrowRight, Search } from "lucide-react";
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import { SearchDialog } from "./search-dialog";
import { GitHubIcon } from "@/components/icons/github";
import { DiscordIcon } from "@/components/icons/discord";
import { NAV_ITEMS } from "@/lib/constants";
import { NavItems } from "@/components/shared/nav-items";

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
      type="button"
      onClick={onToggle}
      className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
      aria-label="Search (⌘K)"
    >
      <Search className="size-4" />
    </button>
  );
}

function HiringBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative flex justify-center">
      <div className="border-border/50 bg-background/60 relative flex items-center gap-3 rounded-full border px-4 py-1.5 backdrop-blur-md">
        <Link
          href="/careers"
          className="group inline-flex items-center gap-1.5 text-xs"
        >
          <span className="shimmer text-muted-foreground group-hover:text-foreground transition-colors">
            We&apos;re hiring. Build the future of agentic UI.
          </span>
          <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3 transition-all group-hover:translate-x-0.5" />
        </Link>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-5 items-center justify-center rounded-full transition-colors"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const pathname = usePathname();
  const [dismissed, setDismissed] = usePersistentBoolean(
    "homepage-hiring-banner-dismissed",
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/github/repo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.stars === "number") {
          setStars(data.stars);
        }
      })
      .catch(console.error);
  }, []);

  const isHome = pathname === "/";
  const showBanner = mounted && isHome && !dismissed;

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-14 bg-linear-to-b to-transparent mask-[linear-gradient(to_bottom,black_75%,transparent)] backdrop-blur-xl" />
      <div className="relative mx-auto flex h-12 w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
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
            <NavItems items={NAV_ITEMS} />
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {!isHome && (
            <>
              <SearchButton onToggle={() => setSearchOpen((prev) => !prev)} />
              <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
            </>
          )}

          <a
            href="https://github.com/assistant-ui/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground hidden items-center gap-2.5 transition-colors sm:flex"
            aria-label="GitHub"
          >
            {stars !== null && (
              <span className="text-sm tabular-nums">
                {formatCompact(stars)}
              </span>
            )}
            <GitHubIcon className="size-4" />
          </a>

          {!isHome && (
            <a
              href="https://discord.gg/S9dwgCNEFs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground hidden size-8 items-center justify-center transition-colors sm:flex"
              aria-label="Discord"
            >
              <DiscordIcon className="size-4" />
            </a>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors md:hidden"
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
          "bg-background fixed inset-x-0 top-12 bottom-0 z-40 transition-opacity duration-200 md:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <nav className="flex h-full flex-col gap-1 overflow-y-auto px-4 pt-4">
          {NAV_ITEMS.map((item) => {
            if (item.type === "link") {
              return item.href.startsWith("http") ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-foreground py-3 text-lg transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-foreground py-3 text-lg transition-colors"
                >
                  {item.label}
                </Link>
              );
            }

            const groups = item.groups;

            return (
              <div key={item.label} className="flex flex-col">
                {groups.map((group) => (
                  <div key={group.label} className="flex flex-col">
                    <span className="text-muted-foreground py-3 text-sm">
                      {group.label}
                    </span>
                    {group.items.map((link) =>
                      link.external ? (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-foreground flex items-center gap-1.5 py-2 pl-4 text-lg transition-colors"
                        >
                          {link.label}
                          <ArrowUpRight className="size-3.5 opacity-40" />
                        </a>
                      ) : (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-foreground py-2 pl-4 text-lg transition-colors"
                        >
                          {link.label}
                        </Link>
                      ),
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          <div className="mt-auto flex gap-4 border-t py-6">
            <a
              href="https://github.com/assistant-ui/assistant-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
            >
              <GitHubIcon className="size-5" />
            </a>
            <a
              href="https://discord.gg/S9dwgCNEFs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
            >
              <DiscordIcon className="size-5" />
            </a>
          </div>
        </nav>
      </div>

      {showBanner && (
        <div className="absolute top-full right-0 left-0">
          <HiringBanner onDismiss={() => setDismissed(true)} />
        </div>
      )}
    </header>
  );
}
