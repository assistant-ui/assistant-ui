import type { ReactNode } from "react";
import { Header } from "@/components/shared/header";
import { LegalLinks } from "@/components/shared/legal-links";
import { LIBRARY_FONT_FAMILIES } from "@/components/pages/library/library-fonts";
import { LibraryThemeStyle } from "@/components/pages/library/library-theme";
import { LibraryToaster } from "@/components/pages/library/library-toast";
import { LibrarySavedSheet } from "@/components/pages/library/saved-sheet";

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    // With the library's sidebar showing, the page is one screen tall: the
    // footer stays at the bottom and the sidebar and the items scroll inside.
    <div className="flex min-h-screen flex-col lg:has-[[data-library-shell]]:h-dvh">
      <LibraryThemeStyle families={LIBRARY_FONT_FAMILIES} />
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
