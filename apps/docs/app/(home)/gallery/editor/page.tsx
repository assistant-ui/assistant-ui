"use client";

import { styledGenerativeUILibrary } from "@/components/gallery/styled";
import { GenerativeUIEditor } from "@/components/gallery/editor";
import { galleryWidgets } from "@/components/gallery/specs";

export default function EditorPage() {
  const initial = galleryWidgets[0]?.spec ?? {
    $type: "Card",
    title: "Hello",
    children: [{ $type: "Text", value: "Edit me!" }],
  };
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:py-24">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">JSON Editor</h1>
        <p className="text-muted-foreground mt-1">
          Edit the{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-[0.85em]">
            $type
          </code>{" "}
          spec on the left, see it render on the right. The library uses the
          styled shadcn primitives from the gallery.
        </p>
      </header>
      <GenerativeUIEditor
        initialSpec={initial}
        library={styledGenerativeUILibrary}
      />
    </main>
  );
}
