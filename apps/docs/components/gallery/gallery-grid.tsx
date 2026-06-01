"use client";

import { GALLERY_WIDGETS } from "@/lib/gallery";
import { WIDGET_PREVIEWS } from "./previews";
import { GALLERY_SPECS } from "./json-ui/specs";
import { GalleryCard } from "./gallery-card";

export function GalleryGrid() {
  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
      {GALLERY_WIDGETS.map((widget) => {
        const Preview = WIDGET_PREVIEWS[widget.slug];
        const spec = GALLERY_SPECS[widget.slug];
        if (!Preview && !spec) return null;
        return (
          <GalleryCard
            key={widget.slug}
            widget={widget}
            Preview={Preview}
            spec={Preview ? undefined : spec}
          />
        );
      })}
    </div>
  );
}
