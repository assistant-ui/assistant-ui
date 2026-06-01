import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { PrimitivesReference } from "@/components/gallery/primitives-reference";

const title = "Primitives";
const description =
  "The component vocabulary a JSON UI spec resolves against, with live previews and props.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function GalleryPrimitivesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 md:py-20">
      <Link
        href="/gallery"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Gallery
      </Link>

      <header className="mb-12 max-w-2xl">
        <p className="text-muted-foreground mb-3 text-sm">Generative UI</p>
        <h1 className="text-2xl font-medium tracking-tight">Primitives</h1>
        <p className="text-muted-foreground mt-2">
          A JSON UI node&apos;s{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-[0.85em]">
            type
          </code>{" "}
          resolves to one of these components in the registry. Compose them to
          build a widget, or register your own under the same schema.{" "}
          <Link
            href="/gallery/editor"
            className="text-foreground hover:text-foreground/70 font-medium transition-colors"
          >
            Open the editor →
          </Link>
        </p>
      </header>

      <PrimitivesReference />
    </main>
  );
}
