import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { sharedDocsOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { DocsChat } from "@/components/docs-chat/DocsChat";
import { Footer } from "@/components/common";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...sharedDocsOptions} tree={source.pageTree}>
      {children}
      <DocsChat />
      <Footer />
    </DocsLayout>
  );
}
