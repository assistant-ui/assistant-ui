"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "./utils";
import { DOCS_SIDEBAR_WIDTH } from "./constants";

export const DOCS_SIDEBAR_ID = "docs-sidebar";

const subscribeToViewport = (onChange: () => void) => {
  const viewport = window.matchMedia("(max-width: 767px)");
  viewport.addEventListener("change", onChange);
  return () => viewport.removeEventListener("change", onChange);
};
const isMobileViewport = () => window.innerWidth < 768;
const serverViewport = () => false;

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

export function DocsSidebar({ children }: { children: ReactNode }) {
  const { open } = useDocsSidebar();
  const isMobile = useSyncExternalStore(
    subscribeToViewport,
    isMobileViewport,
    serverViewport,
  );

  return (
    <aside
      id={DOCS_SIDEBAR_ID}
      inert={!open && isMobile}
      className={cn(
        "bg-background fixed inset-x-0 top-12 bottom-0 z-40 transition-[opacity,visibility] duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0 max-md:invisible",
        "md:pointer-events-auto md:visible md:right-auto md:left-0 md:z-30 md:w-(--sidebar-width) md:opacity-100",
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
