"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import type { GalleryWidget } from "@/lib/gallery";
import { JsonUI } from "./json-ui/render";
import { DEFAULT_REGISTRY } from "./json-ui/primitives";
import type { UINode } from "./json-ui/types";

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
