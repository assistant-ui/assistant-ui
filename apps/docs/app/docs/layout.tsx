import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { DocsRootLayout } from "@/components/docs/layout/docs-root-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsRootLayout tree={source.pageTree} section="Docs" sectionHref="/docs">
      {children}
    </DocsRootLayout>
  );
}
