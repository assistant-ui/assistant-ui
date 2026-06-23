"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
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
import { CloudButton } from "@/components/shared/cloud-button";
import { MoreDropdown } from "@/components/shared/more-dropdown";
import { NavItems } from "@/components/shared/nav-items";
import { useDocsSidebar } from "@/components/docs/contexts/sidebar";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/components/docs/platform/context";
import {
  buildPlatformSections,
  findPathToNode,
} from "@/components/docs/platform/tree";

interface DocsHeaderProps {
  section: string;
  sectionHref: string;
  mobileSectionTree?: PageTree.Root | undefined;
}

function AskAIButton() {
  const { toggle } = useAssistantPanel();

  return (
    <button
      type="button"
      onClick={toggle}
      className="border-border/50 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors"
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
      className="border-border/50 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-full max-w-96 items-center gap-2 rounded-lg border px-3 text-sm transition-colors"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="flex-1 text-left">Search...</span>
      <div className="flex gap-0.5">
        {hotKey.map((k, i) => (
          <kbd
            key={i}
            className="bg-background text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium"
          >
            {k.display}
          </kbd>
        ))}
      </div>
    </button>
  );
}

const CONDENSED_HIDDEN = new Set(["Showcase", "Pricing"]);

function MobileSectionBreadcrumb({
  tree,
  section,
}: {
  tree: PageTree.Root;
  section: string;
}) {
  const pathname = usePathname();
  const { platform } = usePlatform();

  const activeSection = useMemo(() => {
    const folders = tree.children.filter(
      (node): node is PageTree.Folder => node.type === "folder",
    );

    const sections = buildPlatformSections(folders, platform);
    const active = sections.find((folder) => findPathToNode(folder, pathname));
    if (!active || typeof active.name !== "string" || active.name === section) {
      return null;
    }

    return {
      label: active.name,
      href: active.index?.url,
    };
  }, [tree, pathname, platform, section]);

  if (!activeSection) return null;

  return (
    <span className="flex min-w-0 items-center md:hidden">
      <span className="text-muted-foreground/40 mx-3 shrink-0">/</span>
      {activeSection.href ? (
        <Link
          href={activeSection.href}
          className="text-foreground hover:text-foreground/80 min-w-0 truncate text-sm font-medium transition-colors"
        >
          {activeSection.label}
        </Link>
      ) : (
        <span className="text-foreground min-w-0 truncate text-sm font-medium">
          {activeSection.label}
        </span>
      )}
    </span>
  );
}

export function DocsHeader({
  section,
  sectionHref,
  mobileSectionTree,
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
      <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-14 bg-linear-to-b to-transparent mask-[linear-gradient(to_bottom,black_75%,transparent)] backdrop-blur-xl" />
      <div className="relative flex h-12 w-full items-center px-4">
        <div className="flex min-w-0 flex-1 items-center">
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
          <span className="text-muted-foreground/40 mx-3">/</span>
          <Link
            href={sectionHref}
            className="text-foreground hover:text-foreground/80 text-sm font-medium transition-colors"
          >
            {section}
          </Link>
          {mobileSectionTree && (
            <MobileSectionBreadcrumb
              tree={mobileSectionTree}
              section={section}
            />
          )}
        </div>

        {/* Mobile controls */}
        <div className="ml-auto flex shrink-0 items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => {
              analytics.search.opened("header");
              setOpenSearch(true);
            }}
            className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <AskAIButton />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleNavMenuToggle}
            className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
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
            className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
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
            className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <AskAIButton />
          <nav className="flex shrink-0 items-center">
            <NavItems items={condensedItems} megaAlign="end" />
            {moreItems.length > 0 && <MoreDropdown items={moreItems} />}
          </nav>
          <CloudButton variant="docs" />
          <ThemeToggle />
        </div>

        {/* Full nav: lg+ */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <HeaderSearch />
          <AskAIButton />
          <nav className="flex shrink-0 items-center">
            <NavItems items={filteredItems} megaAlign="end" />
          </nav>
          <CloudButton variant="docs" />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile nav menu */}
      <div
        className={cn(
          "bg-background fixed inset-x-0 top-12 bottom-0 z-40 transition-opacity duration-200 md:hidden",
          navMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <nav className="flex h-full flex-col gap-1 overflow-y-auto px-4 pt-4">
          {filteredItems.map((item) => {
            if (item.type === "link") {
              return item.href.startsWith("http") ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setNavMenuOpen(false)}
                  className="text-foreground py-3 text-lg transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setNavMenuOpen(false)}
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
                          onClick={() => setNavMenuOpen(false)}
                          className="text-foreground flex items-center gap-1.5 py-2 pl-4 text-lg transition-colors"
                        >
                          {link.label}
                          <ArrowUpRight className="size-3.5 opacity-40" />
                        </a>
                      ) : (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setNavMenuOpen(false)}
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
          <div className="mt-auto border-t py-6">
            <CloudButton
              variant="mobile"
              className="w-auto"
              onClick={() => setNavMenuOpen(false)}
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
