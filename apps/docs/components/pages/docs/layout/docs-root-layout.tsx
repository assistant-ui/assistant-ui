import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
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
import { PLATFORMS } from "@/lib/constants";

// Platform-bound content rendered for a platform other than the one the
// browser will hydrate to stays hidden until hydration replaces it.
const PLATFORM_HINT_STYLE = PLATFORMS.map(
  (platform) =>
    `html[data-docs-platform-hint="${platform}"] [data-docs-platform]:not([data-docs-platform="${platform}"]){visibility:hidden}`,
).join("");

type DocsRootLayoutProps = {
  tree: PageTree.Root;
  section: string;
  sectionHref: string;
  platformSwitcher?: boolean;
  // Replaces the main docs header, for a sub-project docs site.
  header?: ReactNode;
  children: ReactNode;
};

export function DocsRootLayout({
  tree,
  section,
  sectionHref,
  platformSwitcher = true,
  header,
  children,
}: DocsRootLayoutProps) {
  return (
    <CurrentPageProvider>
      <DocsRuntimeProvider>
        <PlatformProvider tree={tree}>
          <style>{PLATFORM_HINT_STYLE}</style>
          <DocsSidebarProvider>
            <DocsShell>
              {header ?? (
                <DocsHeader
                  section={section}
                  sectionHref={sectionHref}
                  tree={tree}
                />
              )}
              <DocsContent>{children}</DocsContent>
              <DocsSidebar>
                <SidebarContent
                  tree={tree}
                  platformSwitcher={platformSwitcher}
                />
              </DocsSidebar>
            </DocsShell>
          </DocsSidebarProvider>
        </PlatformProvider>
      </DocsRuntimeProvider>
    </CurrentPageProvider>
  );
}
