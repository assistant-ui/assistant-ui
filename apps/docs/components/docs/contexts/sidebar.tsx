"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface DocsSidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const DocsSidebarContext = createContext<DocsSidebarContextValue | null>(null);

export function useDocsSidebar() {
  const ctx = useContext(DocsSidebarContext);
  if (!ctx) {
    throw new Error("useDocsSidebar must be used within DocsSidebarProvider");
  }
  return ctx;
}

export function DocsSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <DocsSidebarContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </DocsSidebarContext.Provider>
  );
}

export const DOCS_SIDEBAR_WIDTH = 260;

/**
 * Renders the sidebar children once and adapts position via responsive CSS:
 * - Mobile: full-screen overlay (top-12 bottom-0 inset-x-0), opacity-toggled by `open`.
 * - Desktop (md+): fixed left rail of `--sidebar-width`, always visible.
 *
 * Single element so `children` (and any state inside, e.g. openSectionId in
 * SidebarContent) is mounted once — no desync between desktop / mobile views.
 */
export function DocsSidebar({ children }: { children: ReactNode }) {
  const { open } = useDocsSidebar();

  return (
    <aside
      className={cn(
        // mobile: fullscreen overlay, opacity-toggled
        "fixed inset-x-0 top-12 bottom-0 z-40 bg-background transition-opacity duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0",
        // desktop: collapse to left rail, always visible
        "md:pointer-events-auto md:right-auto md:z-30 md:w-(--sidebar-width) md:border-border/60 md:border-r md:opacity-100",
      )}
      style={
        {
          "--sidebar-width": `${DOCS_SIDEBAR_WIDTH}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </aside>
  );
}
