"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { NAV_ITEMS } from "@/lib/constants";
import { useDocsSidebar } from "@/components/docs/contexts/sidebar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { analytics } from "@/lib/analytics";

interface DocsHeaderProps {
  section: string;
  sectionHref: string;
}

function HeaderSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      onClick={() => {
        analytics.search.opened("header");
        setOpenSearch(true);
      }}
      className="flex h-8 w-full max-w-96 items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="flex-1 text-left">Search...</span>
      <div className="flex gap-0.5">
        {hotKey.map((k, i) => (
          <kbd
            key={i}
            className="rounded bg-background px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground"
          >
            {k.display}
          </kbd>
        ))}
      </div>
    </button>
  );
}

function MobileControls() {
  const { setOpenSearch } = useSearchContext();
  const { open, toggle } = useDocsSidebar();

  return (
    <div className="ml-auto flex items-center gap-1 md:hidden">
      <button
        onClick={() => {
          analytics.search.opened("header");
          setOpenSearch(true);
        }}
        className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Search"
      >
        <Search className="size-4" />
      </button>
      <ThemeToggle />
      <button
        onClick={toggle}
        className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Toggle menu"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
    </div>
  );
}

export function DocsHeader({ section, sectionHref }: DocsHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mask-[linear-gradient(to_bottom,black_50%,transparent)] dark:mask-[linear-gradient(to_bottom,black_40%,transparent)] pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-background via-60% via-background/80 to-transparent backdrop-blur-xl md:h-24 dark:via-50%" />
      <div className="relative flex h-12 w-full items-center px-4">
        <div className="flex shrink-0 items-center">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/favicon/icon.svg"
              alt="assistant-ui logo"
              width={18}
              height={18}
              className="dark:hue-rotate-180 dark:invert"
            />
            <span className="hidden font-medium tracking-tight sm:inline">
              assistant-ui
            </span>
          </Link>
          <span className="mx-3 text-muted-foreground/40">/</span>
          <Link
            href={sectionHref}
            className="font-medium text-foreground text-sm transition-colors hover:text-foreground/80"
          >
            {section}
          </Link>
        </div>

        <MobileControls />

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <HeaderSearch />
          <nav className="flex shrink-0 items-center">
            {NAV_ITEMS.filter(
              (item) => item.type !== "link" || item.href !== sectionHref,
            ).map((item) =>
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
                              <ArrowUpRight className="size-3 opacity-40" />
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
