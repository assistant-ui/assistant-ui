import {
  NAV_ITEMS,
  type DropdownItem,
  type NavGlyphKind,
} from "@/lib/constants";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_PATH,
  libraryCategoryHref,
  type LibraryCategoryId,
} from "@/lib/library/catalog";

/** A menu link drawn with one of the header's glyphs or one of the library's. */
export type MenuItem = Omit<DropdownItem, "glyph"> & {
  glyph?: NavGlyphKind;
  libraryGlyph?: LibraryCategoryId;
};

export type MenuGroup = { label: string; items: MenuItem[] };

export type SiteNavItem =
  | { type: "link"; label: string; href: string }
  | {
      type: "mega";
      label: string;
      featured?: { label: string; item: MenuItem; extraItems?: MenuItem[] };
      groups: MenuGroup[];
    };

const LIBRARY_GROUPS: readonly (readonly [string, LibraryCategoryId[]])[] = [
  ["Build", ["components", "blocks", "themes", "starters"]],
  ["Connect", ["runtimes", "integrations", "tools"]],
  ["Extend", ["utilities", "skills"]],
];

const categoryLink = (id: LibraryCategoryId): MenuItem => {
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
  featured: {
    label: "Browse",
    item: {
      label: "Library",
      href: LIBRARY_PATH,
      description: "Everything that installs, with its command",
      external: false,
      libraryGlyph: "components",
    },
  },
  groups: LIBRARY_GROUPS.map(([label, ids]) => ({
    label,
    items: ids.map(categoryLink),
  })),
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
