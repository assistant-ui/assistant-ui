import type { Metadata } from "next";
import Link from "next/link";
import { createOgMetadata } from "@/lib/og";
import {
  GALLERY_TEMPLATES,
  type GalleryTemplate,
} from "@/lib/gallery-templates";
import { TemplatePreview } from "@/components/gallery/template-preview";

const title = "Generative UI gallery";
const description =
  "Static widget templates rendered through the real generative-ui vocabulary: themed previews, IR JSON, React code, and usage snippets.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

function GalleryCard({ template }: { template: GalleryTemplate }) {
  return (
    <div className="aui-gallery-item relative mb-6 break-inside-avoid">
      <div aria-hidden="true" className="pointer-events-none select-none">
        <TemplatePreview tree={template.tree} />
      </div>

      <Link
        href={`/gallery/${template.slug}`}
        aria-label={template.title}
        className="focus-visible:outline-ring absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2"
      />
    </div>
  );
}

export default function GalleryPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:py-24">
      <header className="mb-16 flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-muted-foreground mb-3 text-sm">Gallery</p>
          <h1 className="text-2xl font-medium tracking-tight">
            Generative UI widget gallery
          </h1>
          <p className="text-muted-foreground mt-2">
            Widgets rendered through the real generative-ui vocabulary, the same
            components an agent renders at runtime.
          </p>
        </div>
        <Link
          href="/gallery/components"
          className="text-muted-foreground hover:text-foreground shrink-0 text-sm transition-colors"
        >
          Components →
        </Link>
      </header>

      <div className="aui-gallery-canvas columns-1 gap-6 sm:columns-2 lg:columns-3">
        {GALLERY_TEMPLATES.map((template) => (
          <GalleryCard key={template.slug} template={template} />
        ))}
      </div>
    </main>
  );
}
