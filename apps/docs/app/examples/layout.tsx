import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { sharedDocsOptions } from "../../lib/layout.shared";
import { Footer } from "@/components/common";
import { examples } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...sharedDocsOptions} tree={examples.pageTree}>
      {children}
      <Footer />
    </DocsLayout>
  );
}
