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

export function DocsSidebar({ children }: { children: ReactNode }) {
  const { open } = useDocsSidebar();

  return (
    <>
      {/* Desktop: fixed left rail */}
      <aside
        className="fixed top-12 bottom-0 left-0 z-30 hidden w-(--sidebar-width) border-border/60 border-r bg-background md:block"
        style={
          {
            "--sidebar-width": `${DOCS_SIDEBAR_WIDTH}px`,
          } as React.CSSProperties
        }
      >
        {children}
      </aside>
      {/* Mobile: full-screen overlay toggled by header button */}
      <div
        className={cn(
          "fixed inset-x-0 top-12 bottom-0 z-40 bg-background transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {children}
      </div>
    </>
  );
}
