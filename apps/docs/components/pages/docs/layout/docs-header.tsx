"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import { ArrowUpRight, ChevronDown, Menu, Search, X } from "lucide-react";
import { useSearchContext } from "@/components/shared/search-provider";
import { NAV_ITEMS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDocsSidebar } from "@/components/pages/docs/contexts/sidebar";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { HeaderBrandLink } from "@/components/shared/header-brand-link";
import { CartButton } from "@/components/shared/shop-entry";
import { analytics } from "@/lib/analytics";
import { usePlatform } from "@/components/pages/docs/platform/context";
import { PlatformSwitcher } from "@/components/pages/docs/platform/switcher";
import {
  buildPlatformSections,
  findPathToNode,
  getPlatformHomeUrl,
} from "@/components/pages/docs/platform/tree";

interface DocsHeaderProps {
  section: string;
  sectionHref: string;
  tree: PageTree.Root;
}

function HeaderSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();
  return (
    <Button
      variant="ghost"
      onClick={() => {
        analytics.search.opened("header");
        setOpenSearch(true);
      }}
      className="bg-foreground/[0.025] text-muted-foreground hover:text-foreground h-9 w-full min-w-0 justify-start gap-2 font-normal"
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 truncate text-left">Search the docs</span>
      <KbdGroup className="max-lg:hidden">
        {hotKey.map((key, index) => (
          <Kbd key={index}>{key.display}</Kbd>
        ))}
      </KbdGroup>
    </Button>
  );
}

function SiteLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <DropdownMenuItem
      className="min-h-10"
      render={
        external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" />
        ) : (
          <Link href={href} />
        )
      }
    >
      {label}
      {external && <ArrowUpRight className="ml-auto size-3.5" />}
    </DropdownMenuItem>
  );
}

export function DocsSiteMenu({ sectionHref }: { sectionHref: string }) {
  const items = NAV_ITEMS.filter(
    (item) => item.type !== "link" || item.href !== sectionHref,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Site navigation"
        className="text-muted-foreground hover:text-foreground focus-visible:outline-ring flex min-h-11 items-center gap-1 px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Site <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {items.map((item) =>
          item.type === "link" ? (
            <SiteLink
              key={item.href}
              href={item.href}
              label={item.label}
              external={item.href.startsWith("http")}
            />
          ) : (
            item.groups.map((group) => (
              <DropdownMenuGroup key={`${item.label}-${group.label}`}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-sans text-xs tracking-normal normal-case">
                  {group.label}
                </DropdownMenuLabel>
                {group.items.map((link) => (
                  <SiteLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    external={link.external ?? false}
                  />
                ))}
              </DropdownMenuGroup>
            ))
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DocsHeader({ section, sectionHref, tree }: DocsHeaderProps) {
  const { open, toggle } = useDocsSidebar();
  const { toggle: toggleAssistant } = useAssistantPanel();
  const { setOpenSearch } = useSearchContext();
  const pathname = usePathname();
  const { platform } = usePlatform();
  const homeHref = useMemo(
    () => getPlatformHomeUrl(tree, platform) ?? sectionHref,
    [tree, platform, sectionHref],
  );
  const activeSection = useMemo(() => {
    const folders = tree.children.filter(
      (node): node is PageTree.Folder => node.type === "folder",
    );
    return buildPlatformSections(folders, platform).find((folder) =>
      findPathToNode(folder, pathname),
    );
  }, [tree, platform, pathname]);

  return (
    <header className="bg-background sticky top-0 z-50 flex h-14 items-center gap-3 px-3 md:gap-6 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:w-[calc(var(--sidebar-width)-1.25rem)] md:flex-none md:shrink-0 lg:w-auto">
        <HeaderBrandLink labelClassName="hidden xl:inline" />
        <span className="text-muted-foreground/40 max-md:hidden">/</span>
        <Link
          href={homeHref}
          className="text-foreground min-w-0 truncate text-sm font-medium"
        >
          <span className="md:hidden">{activeSection?.name ?? section}</span>
          <span className="max-md:hidden">{section}</span>
        </Link>
        <span className="hidden lg:flex">
          <PlatformSwitcher tree={tree} />
        </span>
      </div>
      <div className="hidden max-w-md min-w-0 flex-1 md:block">
        <HeaderSearch />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        <CartButton />
        <Button
          variant="ghost"
          onClick={toggleAssistant}
          className="min-h-11 px-2 text-sm"
          aria-label="Ask AI (⌘I)"
        >
          Ask AI
        </Button>
        <button
          type="button"
          onClick={() => {
            analytics.search.opened("header");
            setOpenSearch(true);
          }}
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-control flex size-11 items-center justify-center focus-visible:outline-2 md:hidden"
          aria-label="Search the docs"
        >
          <Search className="size-4" />
        </button>
        <div className="hidden sm:block">
          <DocsSiteMenu sectionHref={sectionHref} />
        </div>
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={
            open
              ? "Close documentation navigation"
              : "Open documentation navigation"
          }
          aria-expanded={open}
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-control flex size-11 items-center justify-center focus-visible:outline-2 md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
    </header>
  );
}
