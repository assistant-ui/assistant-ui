"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import type { GalleryWidget } from "@/lib/gallery";
import {
  JsonUI,
  DEFAULT_REGISTRY,
  type UINode,
} from "@/components/generative-ui";

export function GalleryCard({
  widget,
  Preview,
  spec,
}: {
  widget: GalleryWidget;
  Preview?: ComponentType | undefined;
  spec?: UINode | undefined;
}) {
  return (
    <Link
      href={`/gallery/${widget.slug}`}
      aria-label={widget.title}
      className="mb-6 flex break-inside-avoid justify-center transition-opacity hover:opacity-80"
    >
      {Preview ? (
        <Preview />
      ) : spec ? (
        <div className="w-full max-w-[340px]">
          <JsonUI node={spec} registry={DEFAULT_REGISTRY} />
        </div>
      ) : null}
    </Link>
  );
}
