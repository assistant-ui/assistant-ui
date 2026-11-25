import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LibraryProvider } from "@/components/library/library-context";
import { LibraryShell } from "@/components/library/library-shell";
import { getLibraryItems } from "@/lib/library/items";

export const metadata: Metadata = {
  title: { template: "%s · Library · assistant-ui", default: "Library" },
  description:
    "Components, blocks, themes, starters, runtimes, integrations, tools, utilities, and skills for assistant-ui, each with an install command or agent prompt.",
};

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <LibraryProvider items={getLibraryItems()}>
      <div className="h-svh">
        <LibraryShell>{children}</LibraryShell>
      </div>
    </LibraryProvider>
  );
}
