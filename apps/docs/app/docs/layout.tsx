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
import { ChatPanelProvider } from "@/components/docs/contexts/chat-panel";
import {
  DocsContentWithMargin,
  DocsChatPanel,
} from "@/components/docs/layout/docs-with-chat";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";

export default function Layout({ children }: { children: ReactNode }) {
  const tabs = getSidebarTabs(source.pageTree);

  return (
    <ChatPanelProvider>
      <DocsRuntimeProvider>
        <DocsSidebarProvider>
          <DocsHeader section="Docs" sectionHref="/docs" />
          <DocsContentWithMargin>
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
          </DocsContentWithMargin>
          <DocsSidebar>
            <SidebarContent
              tree={source.pageTree}
              banner={<SidebarTabs tabs={tabs} />}
            />
          </DocsSidebar>
        </DocsSidebarProvider>
        <DocsChatPanel />
      </DocsRuntimeProvider>
    </ChatPanelProvider>
  );
}
