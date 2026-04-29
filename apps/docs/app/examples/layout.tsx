import type { ReactNode } from "react";
import { examples } from "@/lib/source";
import { DocsHeader } from "@/components/docs/layout/docs-header";
import { DocsSidebarProvider } from "@/components/docs/contexts/sidebar";
import { ExamplesShell } from "@/components/docs/layout/examples-shell";
import { AssistantPanelProvider } from "@/components/docs/assistant/context";
import { PlatformProvider } from "@/components/docs/contexts/platform";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PlatformProvider>
      <AssistantPanelProvider>
        <DocsSidebarProvider>
          <DocsHeader section="Examples" sectionHref="/examples" />
          <ExamplesShell tree={examples.pageTree}>{children}</ExamplesShell>
        </DocsSidebarProvider>
      </AssistantPanelProvider>
    </PlatformProvider>
  );
}
