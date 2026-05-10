import type { ReactNode } from "react";
import type * as PageTree from "fumadocs-core/page-tree";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { sharedDocsOptions } from "@/lib/layout.shared";

export function ExamplesShell({
  tree,
  children,
}: {
  tree: PageTree.Root;
  children: ReactNode;
}) {
  return (
    <DocsLayout
      {...sharedDocsOptions}
      tree={tree}
      nav={{ enabled: false }}
      sidebar={{ enabled: false }}
    >
      {children}
    </DocsLayout>
  );
}
