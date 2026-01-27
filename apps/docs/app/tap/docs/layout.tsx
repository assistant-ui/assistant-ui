import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { tapDocs } from "@/lib/source";
import { getSidebarTabs } from "@/components/docs/layout/sidebar-tabs.server";
import { AssistantPanelProvider } from "@/components/docs/assistant/context";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import {
  DocsSidebar,
  DocsSidebarProvider,
} from "@/components/docs/contexts/sidebar";
import { DocsHeader } from "@/components/docs/layout/docs-header";
import {
  DocsAssistantPanel,
  DocsContent,
} from "@/components/docs/layout/docs-layout";
import { sharedDocsOptions } from "@/lib/layout.shared";
import { SidebarTabs } from "@/components/docs/layout/sidebar-tabs";
import { CurrentPageProvider } from "@/components/docs/contexts/current-page";
import { SidebarContent } from "@/components/docs/layout/sidebar-content";
import { DocsAssistantRuntimeProvider } from "@/contexts/AssistantRuntimeProvider";

export default function Layout({ children }: { children: ReactNode }) {
  const tabs = getSidebarTabs(tapDocs.pageTree);

  return (
    <CurrentPageProvider>
      <AssistantPanelProvider>
        <DocsRuntimeProvider>
          <DocsSidebarProvider>
            <DocsHeader section="Tap Docs" sectionHref="/tap/docs" />
            <DocsContent>
              <DocsLayout
                {...sharedDocsOptions}
                tree={tapDocs.pageTree}
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
                tree={tapDocs.pageTree}
                banner={<SidebarTabs tabs={tabs} />}
              />
            </DocsSidebar>
          </DocsSidebarProvider>
        </DocsRuntimeProvider>
        <DocsAssistantRuntimeProvider>
          <DocsAssistantPanel />
        </DocsAssistantRuntimeProvider>
      </AssistantPanelProvider>
    </CurrentPageProvider>
  );
}
