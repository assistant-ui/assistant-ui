import type { Metadata } from "next";
import Link from "next/link";
import { createOgMetadata } from "@/lib/og";
import { DesignGallery } from "@/components/pages/design/design-gallery";
import { DESIGN_COMPONENTS } from "@/components/pages/design/registry-meta";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Components";
const description = `${DESIGN_COMPONENTS.length} primitives drawn to the assistant-ui design registers: actions, inputs, display, overlays, and navigation. Every specimen is live; open a component for its variants, API, and source.`;

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function DesignComponentsPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-xl">
        <p className={typeEyebrow}>
          <Link
            href="/design"
            className="hover:text-foreground transition-colors"
          >
            Design
          </Link>
          {" · Components"}
        </p>
        <h1 className={cn("mt-4", typePage)}>The components.</h1>
        <p className={cn("mt-4", typeDeck)}>
          {DESIGN_COMPONENTS.length} primitives, in both Base UI and Radix
          flavors. Every specimen below is live; open a component for its
          variants, API, and source.
        </p>
      </header>

      <DesignGallery />
    </PageFrame>
  );
}
