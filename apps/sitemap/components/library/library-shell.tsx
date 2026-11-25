"use client";

import type { ReactNode } from "react";
import { Panels } from "@/components/library/ui/panels";
import { MAIN_CONTENT_PROPS } from "@/components/shared/skip-link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CartSheet } from "./cart-sheet";
import { LibraryHistoryButtons } from "./library-history";
import { LibrarySidebar } from "./library-sidebar";

/** The frame every library page sits in: the sidebar, and the page beside it. */
export function LibraryShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Panels
        // The server renders the wide layout, so the side panel is hidden on a
        // phone before hydration moves it into its sheet; `!` beats the
        // panel's inline `display`. The glass header takes the page's color,
        // which the dark popover color is lighter than.
        className="h-full [--glass:color-mix(in_oklab,var(--background)_72%,transparent)] [--popover:var(--background)] max-md:[&>#panel-left]:hidden!"
        glassHeader
        headers={{
          left: <LibraryHistoryButtons />,
          main: (
            <ThemeToggle className="hover:text-foreground ms-auto size-7 rounded-md" />
          ),
        }}
        left={<LibrarySidebar />}
      >
        <main
          {...MAIN_CONTENT_PROPS}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {children}
        </main>
      </Panels>
      <CartSheet />
    </>
  );
}
