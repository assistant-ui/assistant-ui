"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import { ArrowUpRight, LayoutGrid, Menu, Search, X } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { NAV_ITEMS, CLOUD_URL, type NavItem } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { MoreDropdown } from "@/components/shared/more-dropdown";
import { NavItems, NavItemsRoot } from "@/components/shared/nav-items";
import { useDocsSidebar } from "@/components/pages/docs/contexts/sidebar";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { HeaderBrandLink } from "@/components/shared/header-brand-link";
import { headerBarClassName } from "@/components/shared/header-chrome";
import { useScrolled } from "@/hooks/use-scrolled";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/components/pages/docs/platform/context";
import {
  buildPlatformSections,
  findPathToNode,
} from "@/components/pages/docs/platform/tree";

interface DocsHeaderProps {
  section: string;
  sectionHref: string;
  mobileSectionTree?: PageTree.Root | undefined;
}

function AskAIButton() {
  const { toggle } = useAssistantPanel();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="shrink-0"
      aria-label="Ask AI (⌘I)"
    >
      Ask AI
      <KbdGroup className="hidden lg:inline-flex">
        <Kbd>⌘</Kbd>
        <Kbd>I</Kbd>
      </KbdGroup>
    </Button>
  );
}

function HeaderSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        analytics.search.opened("header");
        setOpenSearch(true);
      }}
      className="text-muted-foreground hover:text-foreground w-full max-w-96 shrink justify-start gap-2 font-normal"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="flex-1 text-left">Search...</span>
      <KbdGroup>
        {hotKey.map((k, i) => (
          <Kbd key={i}>{k.display}</Kbd>
        ))}
      </KbdGroup>
    </Button>
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
  const scrolled = useScrolled();

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
    <header className="sticky top-0 z-50">
      <NavItemsRoot>
        <div
          className={headerBarClassName(
            scrolled,
            "flex h-12 w-full items-center px-4",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center">
            <HeaderBrandLink labelClassName="hidden sm:inline" />
            <span
              className={cn(
                "text-muted-foreground/40 mx-3",
                mobileSectionTree && "max-md:hidden",
              )}
            >
              /
            </span>
            <Link
              href={sectionHref}
              className={cn(
                "text-foreground hover:text-foreground/80 text-sm font-medium transition-colors",
                mobileSectionTree && "max-md:hidden",
              )}
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
            <AskAIButton />
            <button
              type="button"
              onClick={() => {
                analytics.search.opened("header");
                setOpenSearch(true);
              }}
              className="text-muted-foreground hover:text-foreground flex size-8 cursor-pointer items-center justify-center transition-colors"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNavMenuToggle}
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
              aria-label="Site navigation"
            >
              {navMenuOpen ? (
                <X className="size-4" />
              ) : (
                <LayoutGrid className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleSidebarToggle}
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </button>
          </div>

          {/* Condensed nav: md to lg */}
          <div className="ml-auto hidden items-center gap-4 md:flex lg:hidden">
            <div className="flex items-center gap-2">
              <AskAIButton />
              <button
                type="button"
                onClick={() => {
                  analytics.search.opened("header");
                  setOpenSearch(true);
                }}
                className="text-muted-foreground hover:text-foreground flex size-7 cursor-pointer items-center justify-center transition-colors"
                aria-label="Search"
              >
                <Search className="size-4" />
              </button>
            </div>
            <div className="flex shrink-0 items-center">
              <NavItems
                items={condensedItems}
                contentClassName="mx-auto max-w-7xl"
              />
              {moreItems.length > 0 && <MoreDropdown items={moreItems} />}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={CLOUD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Cloud
              </Button>
              <ThemeToggle />
            </div>
          </div>

          {/* Full nav: lg+ */}
          <div className="ml-auto hidden items-center gap-4 lg:flex">
            <div className="flex min-w-0 items-center gap-2">
              <AskAIButton />
              <HeaderSearch />
            </div>
            <NavItems
              items={filteredItems}
              contentClassName="mx-auto max-w-7xl"
            />
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={CLOUD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Cloud
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Mobile nav menu */}
        <div
          className={cn(
            "bg-background fixed inset-x-0 top-12 bottom-0 z-40 transition-opacity duration-200 md:hidden",
            navMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="flex h-full flex-col gap-1 overflow-y-auto px-4 pt-4">
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

              return (
                <div key={item.label} className="flex flex-col">
                  <span className="text-foreground py-3 text-lg">
                    {item.label}
                  </span>
                  {item.groups.map((group) => (
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
            <div className="mt-auto flex items-center justify-between border-t py-6">
              <Button
                size="sm"
                nativeButton={false}
                className="w-fit"
                onClick={() => setNavMenuOpen(false)}
                render={
                  <a
                    href={CLOUD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Cloud
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </NavItemsRoot>
    </header>
  );
}
