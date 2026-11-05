"use client";

import {
  useId,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Menu, PanelLeft, X } from "lucide-react";
import { DOCS_SIDEBAR_ID, useDocsSidebar } from "./sidebar";
import { cn } from "./utils";

export function DocsSiteHeader({
  brand,
  mobileControls,
  condensedNavigation,
  desktopNavigation,
  mobileNavigation,
  navigationRoot: NavigationRoot,
  scrolled,
}: {
  brand: ReactNode;
  mobileControls: ReactNode;
  condensedNavigation: ReactNode;
  desktopNavigation: ReactNode;
  mobileNavigation: (close: () => void) => ReactNode;
  navigationRoot: ComponentType<{ children: ReactNode }>;
  scrolled: boolean;
}) {
  const {
    open: sidebarOpen,
    setOpen: setSidebarOpen,
    toggle: toggleSidebar,
  } = useDocsSidebar();
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const navMenuId = useId();
  const navMenuToggle = useRef<HTMLButtonElement>(null);
  const closeNavigation = () => {
    setNavMenuOpen(false);
    navMenuToggle.current?.focus();
  };
  const toggleNavigation = () => {
    if (!navMenuOpen) setSidebarOpen(false);
    setNavMenuOpen((open) => !open);
  };
  const toggleMenu = () => {
    if (!sidebarOpen) setNavMenuOpen(false);
    toggleSidebar();
  };
  return (
    <header className="sticky top-0 z-50">
      <NavigationRoot>
        <div
          className={cn(
            "relative z-10 transition-colors duration-200",
            scrolled ? "bg-background/80 backdrop-blur-md" : "bg-transparent",
            "group-data-[menu-open=true]:bg-background",
            "flex h-12 w-full items-center px-4",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center">{brand}</div>
          <div className="ml-auto flex shrink-0 items-center gap-1 md:hidden">
            {mobileControls}
            <button
              type="button"
              ref={navMenuToggle}
              onClick={toggleNavigation}
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
              aria-label="Site navigation"
              aria-expanded={navMenuOpen}
              aria-controls={navMenuId}
            >
              {navMenuOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleMenu}
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
              aria-controls={DOCS_SIDEBAR_ID}
            >
              {sidebarOpen ? (
                <X className="size-4" />
              ) : (
                <PanelLeft className="size-4" />
              )}
            </button>
          </div>
          <div className="ml-auto hidden items-center gap-4 md:flex lg:hidden">
            {condensedNavigation}
          </div>
          <div className="ml-auto hidden items-center gap-4 lg:flex">
            {desktopNavigation}
          </div>
        </div>
        <div
          className={cn(
            "bg-background fixed inset-x-0 top-12 bottom-0 z-40 transition-opacity duration-200 md:hidden",
            navMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          id={navMenuId}
          inert={!navMenuOpen}
        >
          <div className="flex h-full flex-col gap-1 overflow-y-auto px-4 pt-4">
            {mobileNavigation(closeNavigation)}
          </div>
        </div>
      </NavigationRoot>
    </header>
  );
}
