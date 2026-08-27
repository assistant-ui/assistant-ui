import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
import { sharedDocsOptions } from "@/lib/layout.shared";
import { DocsHeader } from "@/components/pages/docs/layout/docs-header";
import {
  DocsSidebarProvider,
  DocsSidebar,
} from "@/components/pages/docs/contexts/sidebar";
import { SidebarContent } from "@/components/pages/docs/layout/sidebar-content";
import {
  DocsContent,
  DocsShell,
} from "@/components/pages/docs/layout/docs-layout";
import { DocsRuntimeProvider } from "@/runtimes/docs";
import { CurrentPageProvider } from "@/components/pages/docs/contexts/current-page";
import { PlatformProvider } from "@/components/pages/docs/platform/context";

type DocsRootLayoutProps = {
  tree: PageTree.Root;
  section: string;
  sectionHref: string;
  showMobileSectionBreadcrumb?: boolean;
  /** Set false for sections that don't share the main docs' React / RN / Ink platform tree. */
  platformAware?: boolean;
  children: ReactNode;
};

export function DocsRootLayout({
  tree,
  section,
  sectionHref,
  showMobileSectionBreadcrumb = false,
  platformAware = true,
  children,
}: DocsRootLayoutProps) {
  return (
    <CurrentPageProvider>
      <DocsRuntimeProvider>
        <PlatformProvider>
          <DocsSidebarProvider>
            <DocsShell>
              <DocsHeader
                section={section}
                sectionHref={sectionHref}
                mobileSectionTree={
                  showMobileSectionBreadcrumb ? tree : undefined
                }
              />
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
                <SidebarContent tree={tree} platformAware={platformAware} />
              </DocsSidebar>
            </DocsShell>
          </DocsSidebarProvider>
        </PlatformProvider>
      </DocsRuntimeProvider>
    </CurrentPageProvider>
  );
}
