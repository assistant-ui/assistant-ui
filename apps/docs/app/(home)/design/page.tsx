import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { DesignGallery } from "@/components/design/design-gallery";
import { PageFrame } from "@/components/shared/page-frame";
import { typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Design";
const description =
  "The design system behind assistant-ui: actions, inputs, display, overlays, and navigation. Every specimen is live; open any component for its variants.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function DesignPage() {
  return (
    <PageFrame pad="sub">
      <header className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <p className={typeEyebrow}>Extend</p>
        <h1 className={cn(typePage, "text-balance")}>The design system.</h1>
        <p className="text-muted-foreground max-w-[46ch] text-[15px] leading-relaxed text-pretty">
          How assistant-ui is drawn: the actions, inputs, overlays, and moving
          pieces every surface shares. Every specimen below is live. Open a
          component for its variants.
        </p>
      </header>

      <DesignGallery />
    </PageFrame>
  );
}
