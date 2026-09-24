import { ELEMENT_INDEX } from "../element-index";
import type { CatalogItem } from "../types";

const prefix = "elements/";

export const elementProductSlug = (elementSlug: string) =>
  `${prefix}${elementSlug}`;

export const ELEMENT_PRODUCTS: readonly CatalogItem[] = ELEMENT_INDEX.map(
  ([slug, title, _registryItem, runtimeWired]) => ({
    slug: elementProductSlug(slug),
    name: title,
    tagline: runtimeWired
      ? "Element, wired to the assistant-ui runtime."
      : "Element, props-only.",
    href: `/elements/${slug}`,
    purchase: "cart",
    glyph: "elements",
    docs: `/elements/${slug}`,
    agentMinutes: [2, 5],
  }),
);
