import type { NavGlyphKind } from "@/lib/constants";

export type CatalogInstallStep = {
  title: string;
  detail: string;
  command?: string;
};

/** What the cart and the setup session need from a product. */
export type CatalogItem = {
  /** The id stored in the cart and sent to the checkout. */
  slug: string;
  name: string;
  /** One line for cards and the cart. */
  tagline: string;
  /** The page that presents the product. */
  href: string;
  /**
   * "setup" products start a setup session directly and never enter the cart;
   * "cart" products can also be collected and set up together.
   */
  purchase: "setup" | "cart";
  glyph: NavGlyphKind;
  docs: string;
  /**
   * Rough wall-clock minutes a coding agent needs to install this product,
   * as a low and high bound. The cart sums them into a delivery estimate.
   */
  agentMinutes: [number, number];
};

/** A product with its own page under /shop. */
export type CatalogProduct = CatalogItem & {
  /** A short paragraph for the detail page. */
  description: string;
  kind: "library" | "service";
  /** Completes the sentence "For …", so it starts lowercase. */
  audience: string;
  license: "MIT" | "Free tier";
  oss: boolean;
  repo?: string;
  packages: string[];
  /** What the product adds, phrased as noun phrases without periods. */
  includes: string[];
  /** Requirements a project must satisfy first, phrased as noun phrases. */
  requires: string[];
  /** The human install path shown on the detail page. */
  steps: CatalogInstallStep[];
};
