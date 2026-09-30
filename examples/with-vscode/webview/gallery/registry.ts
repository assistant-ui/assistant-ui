import sectionModules from "virtual:gallery-sections";
import { GALLERY_CATEGORIES, type GallerySection } from "./types";

export type RegisteredSection = GallerySection & { file: string };

/**
 * Every section exported by a file in `webview/gallery/sections/`, collected
 * by the `virtual:gallery-sections` build plugin, ordered by category, then id.
 */
export const SECTIONS: readonly RegisteredSection[] = sectionModules
  .flatMap(({ file, value }) => value.map((section) => ({ ...section, file })))
  .sort(
    (a, b) =>
      GALLERY_CATEGORIES.indexOf(a.category) -
        GALLERY_CATEGORIES.indexOf(b.category) || a.id.localeCompare(b.id),
  );

/** Ids defined more than once or not in kebab-case. */
export const sectionConflicts = () => {
  const conflicts: string[] = [];
  const files = new Map<string, string>();
  for (const { id, file } of SECTIONS) {
    const other = files.get(id);
    if (other) conflicts.push(`${id} is defined in ${other} and ${file}`);
    files.set(id, file);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      conflicts.push(`${id} (${file}) is not kebab-case`);
    }
  }
  return conflicts;
};
