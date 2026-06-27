"use client";

import { renderGenerativeUI } from "@assistant-ui/react-generative-ui";
import type { GenerativeUILibrary } from "@assistant-ui/react-generative-ui";
import Link from "next/link";
import type { GalleryWidgetSpec } from "./specs";

export function GalleryGrid({
  widgets,
  library,
}: {
  widgets: GalleryWidgetSpec[];
  library: GenerativeUILibrary;
}) {
  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
      {widgets.map((w) => (
        <GalleryCard key={w.slug} widget={w} library={library} />
      ))}
    </div>
  );
}

function GalleryCard({
  widget,
  library,
}: {
  widget: GalleryWidgetSpec;
  library: GenerativeUILibrary;
}) {
  return (
    <Link
      href={`/gallery/${widget.slug}`}
      className="border-border/60 bg-card block overflow-hidden rounded-2xl border"
    >
      <div className="bg-muted/20 flex min-h-[200px] items-center justify-center overflow-hidden p-8">
        <div className="pointer-events-none w-full max-w-sm">
          {renderGenerativeUI(widget.spec, library, { status: "done" })}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-foreground text-sm font-medium">
            {widget.title}
          </h3>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
            {widget.category}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {widget.description}
        </p>
      </div>
    </Link>
  );
}
