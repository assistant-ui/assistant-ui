import {
  NAV_ITEMS,
  type DropdownItem,
  type NavGlyphKind,
} from "@/lib/constants";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_GROUPS,
  LIBRARY_PATH,
  SETUP_PATH,
  libraryCategoryHref,
  type LibraryPageId,
} from "@/lib/library/catalog";

/** A menu link drawn with one of the header's glyphs or one of the library's. */
export type MenuItem = Omit<DropdownItem, "glyph"> & {
  glyph?: NavGlyphKind;
  libraryGlyph?: LibraryPageId;
};

export type MenuGroup = { label: string; items: MenuItem[] };

export type SiteNavItem =
  | { type: "link"; label: string; href: string }
  | {
      type: "mega";
      label: string;
      featured?: { label: string; item: MenuItem; extraItems?: MenuItem[] };
      groups: MenuGroup[];
      /** A plain link under the columns. */
      footer?: { label: string; href: string };
    };

const pageLink = (id: LibraryPageId): MenuItem => {
  if (id === "setup") {
    return {
      label: "Setup",
      href: SETUP_PATH,
      description: "Have a coding agent install and set up assistant-ui",
      external: false,
      libraryGlyph: "setup",
    };
  }
  const category = LIBRARY_CATEGORIES.find((entry) => entry.id === id)!;
  return {
    label: category.label,
    href: libraryCategoryHref(id),
    description: category.description.replace(/\.$/, ""),
    external: false,
    libraryGlyph: id,
  };
};

export const LIBRARY_NAV_ITEM: SiteNavItem = {
  type: "mega",
  label: "Library",
  groups: LIBRARY_GROUPS.map(({ label, pages }) => ({
    label,
    items: pages.map(pageLink),
  })),
  footer: { label: "See the whole library", href: LIBRARY_PATH },
};

/** The docs site's header links, with the Library menu where Components was. */
export const SITE_NAV_ITEMS: SiteNavItem[] = NAV_ITEMS.map((item) =>
  item.type === "link" && item.href === "/components" ? LIBRARY_NAV_ITEM : item,
);

export function siteMegaGroups(
  item: Extract<SiteNavItem, { type: "mega" }>,
): MenuGroup[] {
  if (!item.featured) return item.groups;
  const { label, item: lead, extraItems = [] } = item.featured;
  return [{ label, items: [lead, ...extraItems] }, ...item.groups];
}
