"use client";

import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { galleryWidgets } from "@/components/gallery/specs";
import { styledGenerativeUILibrary } from "@/components/gallery/styled";
import Link from "next/link";

export default function GalleryPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:py-24">
      <header className="mb-16 max-w-2xl">
        <p className="text-muted-foreground mb-3 text-sm">Generative UI</p>
        <h1 className="text-2xl font-medium tracking-tight">
          Component gallery
        </h1>
        <p className="text-muted-foreground mt-2">
          Rich, interactive components your assistant renders from a JSON spec
          through the{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-[0.85em]">
            present
          </code>{" "}
          tool call. Browse the widgets below, try the{" "}
          <Link
            href="/gallery/editor"
            className="text-foreground hover:text-foreground/70 font-medium transition-colors"
          >
            JSON editor
          </Link>
          , or explore the{" "}
          <Link
            href="/gallery/primitives"
            className="text-foreground hover:text-foreground/70 font-medium transition-colors"
          >
            primitives
          </Link>
          .
        </p>
      </header>
      <GalleryGrid
        widgets={galleryWidgets}
        library={styledGenerativeUILibrary}
      />
    </main>
  );
}
