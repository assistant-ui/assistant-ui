"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

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
  const { open, setOpen } = useDocsSidebar();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 flex max-w-full translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-full"
        >
          <div className="flex h-14 shrink-0 items-center justify-between px-5">
            <DialogTitle className="text-sm font-medium">
              Documentation
            </DialogTitle>
            <DialogClose
              aria-label="Close documentation navigation"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-control flex size-11 items-center justify-center focus-visible:outline-2"
            >
              <X className="size-4" />
            </DialogClose>
          </div>
          <div className="min-h-0 flex-1">{children}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <aside
      aria-label="Documentation navigation"
      className={cn(
        "bg-background fixed top-(--docs-header-height) bottom-0 left-0 z-30 hidden w-(--sidebar-width) md:block",
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
