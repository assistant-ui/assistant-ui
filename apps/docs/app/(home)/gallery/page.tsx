import type { Metadata } from "next";
import Link from "next/link";
import { createOgMetadata } from "@/lib/og";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

const title = "Generative UI Gallery";
const description =
  "Rich, interactive components your assistant can render from a tool call.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function GalleryPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:py-24">
      <header className="mb-16 max-w-2xl">
        <p className="text-muted-foreground mb-3 text-sm">Generative UI</p>
        <h1 className="text-2xl font-medium tracking-tight">
          Component gallery
        </h1>
        <p className="text-muted-foreground mt-2">
          Rich, interactive components your assistant can render two ways: as a
          real React component returned from a generative tool&apos;s{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-[0.85em]">
            render
          </code>
          , or composed from JSON through a shared component schema. Browse the{" "}
          <Link
            href="/gallery/primitives"
            className="text-foreground hover:text-foreground/70 font-medium transition-colors"
          >
            primitives
          </Link>{" "}
          or try the{" "}
          <Link
            href="/gallery/editor"
            className="text-foreground hover:text-foreground/70 font-medium transition-colors"
          >
            JSON editor →
          </Link>
        </p>
      </header>

      <GalleryGrid />

      <section className="mt-16">
        <p className="text-muted-foreground">
          Learn how to wire these up in the{" "}
          <Link
            href="/docs/guides/tool-ui"
            className="text-foreground hover:text-foreground/70 font-medium transition-colors"
          >
            tool UI guide →
          </Link>
        </p>
      </section>
    </main>
  );
}
