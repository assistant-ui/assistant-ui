import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { GalleryJsonEditor } from "@/components/gallery/json-editor";
import { WEATHER_SPEC } from "@/components/gallery/specs";

const title = "JSON UI editor";
const description = "Render a UI component directly from JSON.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function GalleryEditorPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 md:py-20">
      <Link
        href="/gallery"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Gallery
      </Link>

      <header className="mb-8 max-w-2xl">
        <p className="text-muted-foreground mb-3 text-sm">Generative UI</p>
        <h1 className="text-2xl font-medium tracking-tight">JSON to UI</h1>
        <p className="text-muted-foreground mt-2">
          Edit the JSON on the left; it renders live on the right through the
          component registry. The model emits the same JSON, and the same schema
          addresses both the shipped components and your own. See every
          available node in the{" "}
          <Link
            href="/gallery/primitives"
            className="text-foreground hover:text-foreground/70 font-medium transition-colors"
          >
            primitives reference →
          </Link>
        </p>
      </header>

      <GalleryJsonEditor initialSpec={WEATHER_SPEC} />
    </main>
  );
}
