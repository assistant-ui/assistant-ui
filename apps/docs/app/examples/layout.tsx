import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "../../lib/layout.shared";
import { Footer } from "@/components/common";
import { examples } from "@/lib/source";

// Create a hybrid options that uses baseOptions for navbar but adds sidebar functionality
const examplesOptions = {
  ...baseOptions,
  tree: examples.pageTree,
  sidebar: {
    defaultOpenLevel: 0,
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...examplesOptions}>
      {children}
      <Footer />
    </DocsLayout>
  );
}
