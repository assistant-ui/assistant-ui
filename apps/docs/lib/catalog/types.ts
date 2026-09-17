import type { NavGlyphKind } from "@/lib/constants";

export type CatalogInstallStep = {
  title: string;
  detail: string;
  command?: string;
};

export type CheckoutStep = {
  /** Stable across releases; the agent reports progress against it. */
  id: string;
  title: string;
  detail?: string;
};

export type CheckoutQuestion = {
  prompt: string;
  placeholder?: string;
  /** The agent may proceed without an answer. */
  optional?: boolean;
};

export type CatalogProduct = {
  /** Route segment under /catalog and the id stored in the cart. */
  slug: string;
  name: string;
  /** One line for cards and the cart. */
  tagline: string;
  /** A short paragraph for the detail page. */
  description: string;
  kind: "library" | "service";
  /** Completes the sentence "For …", so it starts lowercase. */
  audience: string;
  license: "MIT" | "Free tier";
  oss: boolean;
  glyph: NavGlyphKind;
  docs: string;
  repo?: string;
  packages: string[];
  /** What the product adds, phrased as noun phrases without periods. */
  includes: string[];
  /** Requirements a project must satisfy first, phrased as noun phrases. */
  requires: string[];
  /**
   * Rough wall-clock minutes a coding agent needs to install this product,
   * as a low and high bound. The cart sums them into a delivery estimate.
   */
  agentMinutes: [number, number];
  /** The human install path shown on the detail page. */
  steps: CatalogInstallStep[];
  /** What the agent works through during checkout, and what it asks first. */
  checkout: {
    steps: CheckoutStep[];
    questions?: CheckoutQuestion[];
  };
  /**
   * Markdown a coding agent follows to install this product. It is
   * concatenated with the other cart items, so it must stand alone and must
   * not repeat the shared preamble in install-prompt.ts.
   */
  agent: string;
};
