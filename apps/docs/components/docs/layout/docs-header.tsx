"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  LayoutGrid,
  Menu,
  Search,
  SparklesIcon,
  X,
} from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { NAV_ITEMS, type NavItem } from "@/lib/constants";
import { MoreDropdown } from "@/components/shared/more-dropdown";
import { NavItems } from "@/components/shared/nav-items";
import { useDocsSidebar } from "@/components/docs/contexts/sidebar";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { PlatformSwitcher } from "@/components/docs/layout/platform-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface DocsHeaderProps {
  section: string;
  sectionHref: string;
  /** When true, render the platform (React/RN/Ink) switcher. Docs route only. */
  platformSwitcher?: boolean;
}

function AskAIButton() {
  const { toggle } = useAssistantPanel();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Ask AI"
    >
      <SparklesIcon className="size-3.5" />
    </button>
  );
}

function HeaderSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      type="button"
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

const CONDENSED_HIDDEN = new Set(["Showcase", "Playground", "Pricing"]);

export function DocsHeader({
  section,
  sectionHref,
  platformSwitcher = false,
}: DocsHeaderProps) {
  const { setOpenSearch } = useSearchContext();
  const {
    open: sidebarOpen,
    setOpen: setSidebarOpen,
    toggle: toggleSidebar,
  } = useDocsSidebar();
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  const sectionFilter = (item: (typeof NAV_ITEMS)[number]) =>
    item.type !== "link" || item.href !== sectionHref;
  const filteredItems = NAV_ITEMS.filter(sectionFilter);
  const condensedItems = filteredItems.filter(
    (item) => !CONDENSED_HIDDEN.has(item.label),
  );
  const moreItems = filteredItems.filter(
    (item): item is Extract<NavItem, { type: "link" }> =>
      item.type === "link" && CONDENSED_HIDDEN.has(item.label),
  );

  const handleNavMenuToggle = () => {
    if (!navMenuOpen) setSidebarOpen(false);
    setNavMenuOpen((prev) => !prev);
  };

  const handleSidebarToggle = () => {
    if (!sidebarOpen) setNavMenuOpen(false);
    toggleSidebar();
  };

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
          {platformSwitcher && (
            <>
              <span className="mx-2 hidden text-muted-foreground/40 sm:inline">
                ·
              </span>
              <div className="hidden sm:block">
                <PlatformSwitcher />
              </div>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="ml-auto flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => {
              analytics.search.opened("header");
              setOpenSearch(true);
            }}
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <AskAIButton />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleNavMenuToggle}
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Site navigation"
          >
            {navMenuOpen ? (
              <X className="size-5" />
            ) : (
              <LayoutGrid className="size-4.5" />
            )}
          </button>
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>

        {/* Condensed nav: md to lg */}
        <div className="ml-auto hidden items-center gap-2 md:flex lg:hidden">
          <button
            type="button"
            onClick={() => {
              analytics.search.opened("header");
              setOpenSearch(true);
            }}
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <AskAIButton />
          <nav className="flex shrink-0 items-center">
            <NavItems items={condensedItems} />
            {moreItems.length > 0 && <MoreDropdown items={moreItems} />}
          </nav>
          <ThemeToggle />
        </div>

        {/* Full nav: lg+ */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <HeaderSearch />
          <AskAIButton />
          <nav className="flex shrink-0 items-center">
            <NavItems items={filteredItems} />
          </nav>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile nav menu */}
      <div
        className={cn(
          "fixed inset-x-0 top-12 bottom-0 z-40 bg-background transition-opacity duration-200 md:hidden",
          navMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <nav className="flex h-full flex-col gap-1 overflow-y-auto px-4 pt-4">
          {platformSwitcher && (
            <div className="pb-3">
              <PlatformSwitcher />
            </div>
          )}
          {filteredItems.map((item) =>
            item.type === "link" ? (
              item.href.startsWith("http") ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setNavMenuOpen(false)}
                  className="py-3 text-foreground text-lg transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setNavMenuOpen(false)}
                  className="py-3 text-foreground text-lg transition-colors"
                >
                  {item.label}
                </Link>
              )
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
                      onClick={() => setNavMenuOpen(false)}
                      className="flex items-center gap-1.5 py-2 pl-4 text-foreground text-lg transition-colors"
                    >
                      {link.label}
                      <ArrowUpRight className="size-3.5 opacity-40" />
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setNavMenuOpen(false)}
                      className="py-2 pl-4 text-foreground text-lg transition-colors"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
