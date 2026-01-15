import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { sharedDocsOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { SidebarTabs } from "@/components/docs/layout/sidebar-tabs";
import { getSidebarTabs } from "@/components/docs/layout/sidebar-tabs.server";

export default function Layout({ children }: { children: ReactNode }) {
  const tabs = getSidebarTabs(source.pageTree);

  return (
    <DocsLayout
      {...sharedDocsOptions}
      tree={source.pageTree}
      sidebar={{
        ...sharedDocsOptions.sidebar,
        tabs: false,
        banner: <SidebarTabs tabs={tabs} />,
      }}
    >
      {children}
    </DocsLayout>
  );
}
