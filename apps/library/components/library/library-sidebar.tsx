"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search01Icon, ShoppingCart01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { usePanels } from "@/components/library/ui/panels";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_PATH,
  libraryCategoryAt,
  libraryCategoryHref,
} from "@/lib/library/catalog";
import { LibraryGlyph } from "./library-glyph";
import { cartCountLabel } from "./cart-sheet";
import {
  libraryCart,
  useCartItems,
  useLibrary,
  useLibraryCounts,
} from "./library-context";

const noop = () => {};

/**
 * The sidebar in the left panel: the name, which is the way home, with a search
 * at its right that opens a field under the row; then the cart, and the
 * library's categories under their label, which goes home too. The category
 * being shown is marked. The panels frame
 * shows and hides it, so the kit sidebar's own context is here only for its
 * parts to read: held open, its wrapper kept out of the layout with
 * `contents`, and ⌘B left to the frame.
 */
export function LibrarySidebar() {
  const pathname = usePathname();
  const { closeSheet } = usePanels();
  const counts = useLibraryCounts();
  const current = libraryCategoryAt(pathname);
  const { query, setQuery } = useLibrary();
  const cartCount = useCartItems().length;
  const [searching, setSearching] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) field.current?.focus();
  }, [searching]);

  const closeSearch = () => {
    setSearching(false);
    setQuery("");
  };

  return (
    <SidebarProvider open onOpenChange={noop} className="contents">
      <Sidebar
        collapsible="none"
        className="bg-background min-h-0 w-full flex-1"
      >
        <SidebarHeader className="pb-0">
          <div className="flex min-w-0 items-center gap-0.5">
            <Link
              href={LIBRARY_PATH}
              aria-current={pathname === LIBRARY_PATH ? "page" : undefined}
              // On a phone the sidebar is a sheet over the page, so following
              // a link puts it away.
              onClick={closeSheet}
              className="text-foreground focus-visible:ring-sidebar-ring flex h-8 min-w-0 items-center rounded-md px-2 font-medium tracking-tight outline-none focus-visible:ring-1"
            >
              <span className="truncate">Agentbase</span>
            </Link>
            <TooltipIconButton
              tooltip="Search the library"
              aria-pressed={searching}
              aria-expanded={searching}
              onClick={() => (searching ? closeSearch() : setSearching(true))}
              className={cn(
                "ms-auto size-7 shrink-0",
                searching && "bg-sidebar-accent",
              )}
            >
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={1.5}
                aria-hidden
              />
            </TooltipIconButton>
          </div>
          {searching ? (
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={1.5}
                aria-hidden
                className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
              />
              <Input
                ref={field}
                type="search"
                value={query}
                placeholder="Search the library"
                aria-label="Search the library"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  closeSearch();
                }}
                className="h-8 bg-transparent ps-8 [&::-webkit-search-cancel-button]:hidden"
              />
            </div>
          ) : null}
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pb-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    aria-label={`Open cart, ${cartCountLabel(cartCount)}`}
                    onClick={() => {
                      closeSheet();
                      libraryCart.setCartOpen(true);
                    }}
                    className="cursor-pointer pe-9"
                  >
                    <span className="flex w-[1.667rem] shrink-0 justify-center">
                      <HugeiconsIcon
                        icon={ShoppingCart01Icon}
                        strokeWidth={1.5}
                        aria-hidden
                        className="text-muted-foreground"
                      />
                    </span>
                    <span className="truncate">Cart</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-muted-foreground font-normal">
                    {cartCount}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel
              render={
                <Link
                  href={LIBRARY_PATH}
                  aria-current={pathname === LIBRARY_PATH ? "page" : undefined}
                  // On a phone the sidebar is a sheet over the page, so
                  // following a link puts it away.
                  onClick={closeSheet}
                />
              }
              className="hover:text-sidebar-foreground transition-colors"
            >
              Library
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label="Library">
                <SidebarMenu className="gap-0.5">
                  {LIBRARY_CATEGORIES.map(({ id, label }) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton
                        isActive={id === current}
                        render={
                          <Link
                            href={libraryCategoryHref(id)}
                            aria-current={id === current ? "page" : undefined}
                            data-nav-glyph-motion
                            onClick={closeSheet}
                          />
                        }
                        className="group/navlink pe-9 [&_svg]:h-5 [&_svg]:w-[1.667rem]"
                      >
                        <LibraryGlyph category={id} />
                        <span className="truncate">{label}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge className="text-muted-foreground font-normal">
                        {counts.get(id) ?? 0}
                      </SidebarMenuBadge>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
