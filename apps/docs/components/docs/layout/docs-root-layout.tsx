import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
import { sharedDocsOptions } from "@/lib/layout.shared";
import { DocsHeader } from "@/components/docs/layout/docs-header";
import {
  DocsSidebarProvider,
  DocsSidebar,
} from "@/components/docs/contexts/sidebar";
import { SidebarContent } from "@/components/docs/layout/sidebar-content";
import { AssistantPanelProvider } from "@/components/docs/assistant/context";
import {
  DocsContent,
  DocsAssistantPanel,
} from "@/components/docs/layout/docs-layout";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import { DocsAssistantRuntimeProvider } from "@/contexts/AssistantRuntimeProvider";
import { CurrentPageProvider } from "@/components/docs/contexts/current-page";
import { PlatformProvider } from "@/components/docs/contexts/platform";
import { FloatingComposer } from "@/components/docs/assistant/floating-composer";

type DocsRootLayoutProps = {
  tree: PageTree.Root;
  section: string;
  sectionHref: string;
  children: ReactNode;
};

export function DocsRootLayout({
  tree,
  section,
  sectionHref,
  children,
}: DocsRootLayoutProps) {
  return (
    <CurrentPageProvider>
      <AssistantPanelProvider>
        <DocsRuntimeProvider>
          <PlatformProvider>
            <DocsSidebarProvider>
              <DocsHeader section={section} sectionHref={sectionHref} />
              <DocsContent>
                <DocsLayout
                  {...sharedDocsOptions}
                  tree={tree}
                  nav={{ enabled: false }}
                  sidebar={{ enabled: false }}
                >
                  {children}
                </DocsLayout>
              </DocsContent>
              <DocsSidebar>
                <SidebarContent tree={tree} />
              </DocsSidebar>
            </DocsSidebarProvider>
          </PlatformProvider>
        </DocsRuntimeProvider>
        <DocsAssistantRuntimeProvider>
          <DocsAssistantPanel />
          <FloatingComposer />
        </DocsAssistantRuntimeProvider>
      </AssistantPanelProvider>
    </CurrentPageProvider>
  );
}
