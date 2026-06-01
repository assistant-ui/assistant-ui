import type { ReactNode } from "react";
import { tapDocs } from "@/lib/source";
import { DocsRootLayout } from "@/components/docs/layout/docs-root-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsRootLayout
      tree={tapDocs.pageTree}
      section="Tap Docs"
      sectionHref="/tap/docs"
    >
      {children}
    </DocsRootLayout>
  );
}
