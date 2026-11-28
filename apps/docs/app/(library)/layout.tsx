import type { ReactNode } from "react";
import { Header } from "@/components/shared/header";
import { LegalLinks } from "@/components/shared/legal-links";
import { LibraryToaster } from "@/components/pages/library/library-toast";
import { LibrarySavedSheet } from "@/components/pages/library/saved-sheet";

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {children}
      <LibrarySavedSheet />
      <LibraryToaster />
      <footer className="mx-auto w-full max-w-7xl px-4 pb-10">
        <div className="border-t pt-6">
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
