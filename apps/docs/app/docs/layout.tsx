import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { sharedDocsOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { SidebarTabs } from "@/components/docs/layout/sidebar-tabs";
import { getSidebarTabs } from "@/components/docs/layout/sidebar-tabs.server";
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
import { FloatingComposer } from "@/components/docs/assistant/floating-composer";

export default function Layout({ children }: { children: ReactNode }) {
  const tabs = getSidebarTabs(source.pageTree);

  return (
    <CurrentPageProvider>
      <AssistantPanelProvider>
        <DocsRuntimeProvider>
          <DocsSidebarProvider>
            <DocsHeader section="Docs" sectionHref="/docs" />
            <DocsContent>
              <DocsLayout
                {...sharedDocsOptions}
                tree={source.pageTree}
                nav={{ enabled: false }}
                sidebar={{
                  ...sharedDocsOptions.sidebar,
                  tabs: false,
                  banner: <SidebarTabs tabs={tabs} />,
                }}
              >
                {children}
              </DocsLayout>
            </DocsContent>
            <DocsSidebar>
              <SidebarContent
                tree={source.pageTree}
                banner={<SidebarTabs tabs={tabs} />}
              />
            </DocsSidebar>
          </DocsSidebarProvider>
        </DocsRuntimeProvider>
        <DocsAssistantRuntimeProvider>
          <DocsAssistantPanel />
          <FloatingComposer />
        </DocsAssistantRuntimeProvider>
      </AssistantPanelProvider>
    </CurrentPageProvider>
  );
}
