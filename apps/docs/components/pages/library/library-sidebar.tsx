"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LibraryLayout = "tabs" | "sidebar";

const STORAGE_KEY = "aui-library-layout";
const listeners = new Set<() => void>();

const readStored = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

const remember = (layout: LibraryLayout) => {
  try {
    localStorage.setItem(STORAGE_KEY, layout);
  } catch {}
  for (const listener of listeners) listener();
};

/** How the library lists its types, as the person last picked: tabs across the top, or a sidebar. */
export const useLibraryLayout = () => {
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const layout: LibraryLayout = stored === "sidebar" ? "sidebar" : "tabs";
  return [layout, remember] as const;
};

export type LibrarySidebarItem<T extends string> = {
  id: T;
  label: string;
  count: number;
  glyph: ReactNode;
};

/** The library's types down the side: each with its drawing and how many items it holds, the open one marked. */
export function LibrarySidebar<T extends string>({
  items,
  value,
  onValueChange,
  className,
}: {
  items: readonly LibrarySidebarItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Library"
      // The page does not scroll beside it, so a list taller than the frame
      // scrolls inside itself.
      className={cn(
        "-m-1 h-full min-h-0 [scrollbar-width:thin] overflow-y-auto p-1",
        className,
      )}
    >
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const selected = item.id === value;
          return (
            <li key={item.id}>
              <button
                type="button"
                data-nav-glyph-motion
                aria-current={selected ? "page" : undefined}
                onClick={() => onValueChange(item.id)}
                className={cn(
                  "group/navlink focus-visible:ring-ring flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg ps-2 pe-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 [&_svg]:h-5 [&_svg]:w-[1.667rem] [&_svg]:shrink-0",
                  selected
                    ? "bg-foreground/[0.06] text-foreground dark:bg-foreground/[0.09] font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]",
                  item.count === 0 && !selected && "opacity-50",
                )}
              >
                {item.glyph}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                  {item.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
