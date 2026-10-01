import type { ReactNode } from "react";

export const GALLERY_CATEGORIES = ["chat", "content", "agents"] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export type GallerySection = {
  /** Unique, kebab-case; used for the anchor, `section` selector and screenshot file name. */
  id: string;
  title: string;
  category: GalleryCategory;
  /** Renders the example. Wrap it in `SeededRuntime` when it needs a runtime. */
  render: () => ReactNode;
  /** Shown under the title: what the section demonstrates or a known issue. */
  notes?: string;
};

/** Types the default export of a file in `webview/gallery/sections/`. */
export const defineSections = (sections: readonly GallerySection[]) => sections;
