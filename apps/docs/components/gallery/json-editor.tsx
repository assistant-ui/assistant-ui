"use client";

import { JsonUiEditor, type UINode } from "@/components/generative-ui";
import { GALLERY_REGISTRY } from "./registry";

export function GalleryJsonEditor({
  initialSpec,
}: {
  initialSpec: UINode | readonly UINode[];
}) {
  return <JsonUiEditor initialSpec={initialSpec} registry={GALLERY_REGISTRY} />;
}
