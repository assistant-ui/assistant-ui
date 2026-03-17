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

export function DocsSidebar({ children }: { children: ReactNode }) {
  const { open } = useDocsSidebar();

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-12 bottom-0 z-40 bg-background transition-opacity duration-200 md:hidden",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {children}
    </div>
  );
}
