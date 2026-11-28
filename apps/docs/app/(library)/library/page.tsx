import type { Metadata } from "next";
import { PageFrame } from "@/components/shared/page-frame";
import { createOgMetadata } from "@/lib/og";
import { LibraryBrowser } from "@/components/pages/library/library-browser";

const title = "Library";
const description =
  "Components, blocks, starters, runtimes, integrations, utilities, skills, and editor setups for assistant-ui projects.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function LibraryPage(): React.ReactElement {
  return (
    <PageFrame
      pad="sub"
      className="pt-6 md:pt-8 lg:has-[[data-library-shell]]:min-h-0 lg:has-[[data-library-shell]]:flex-1 lg:has-[[data-library-shell]]:pb-0"
    >
      <LibraryBrowser />
    </PageFrame>
  );
}
