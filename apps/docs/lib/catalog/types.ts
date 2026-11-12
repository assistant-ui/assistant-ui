import type { NavGlyphKind } from "@/lib/constants";

export type CatalogInstallStep = {
  title: string;
  detail: string;
  command?: string;
};

/** What the catalog and the setup session need from a product. */
export type CatalogItem = {
  /** The id sent to the setup. */
  slug: string;
  name: string;
  /** One line for cards. */
  tagline: string;
  /** The page that presents the product. */
  href: string;
  glyph: NavGlyphKind;
  docs: string;
  /**
   * Rough wall-clock minutes a coding agent needs to install this product,
   * as a low and high bound.
   */
  agentMinutes: [number, number];
  /** The /elements slug of the element whose demo shows the product running. */
  preview?: string;
  hidden?: boolean;
};

/** A product with its own page under /components. */
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
  /** What works once it is installed, with no further setup, phrased as noun phrases without periods. */
  features?: string[];
  /** The /elements slugs of the elements the product installs, the container first. */
  bundle?: string[];
  /** Requirements a project must satisfy first, phrased as noun phrases. */
  requires: string[];
  /** The human install path shown on the detail page. */
  steps: CatalogInstallStep[];
};
