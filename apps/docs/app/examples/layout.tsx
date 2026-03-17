import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { sharedDocsOptions } from "@/lib/layout.shared";
import { examples } from "@/lib/source";
import { DocsHeader } from "@/components/docs/layout/docs-header";
import {
  DocsSidebarProvider,
  DocsSidebar,
} from "@/components/docs/contexts/sidebar";
import { SidebarContent } from "@/components/docs/layout/sidebar-content";
import { AssistantPanelProvider } from "@/components/docs/assistant/context";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AssistantPanelProvider>
      <DocsSidebarProvider>
        <DocsHeader section="Examples" sectionHref="/examples" />
        <DocsLayout
          {...sharedDocsOptions}
          tree={examples.pageTree}
          nav={{ enabled: false }}
        >
          {children}
        </DocsLayout>
        <DocsSidebar>
          <SidebarContent tree={examples.pageTree} />
        </DocsSidebar>
      </DocsSidebarProvider>
    </AssistantPanelProvider>
  );
}
