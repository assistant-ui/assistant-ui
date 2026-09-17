import { aiSdk } from "./products/ai-sdk";
import { cloud } from "./products/cloud";
import type { CatalogProduct } from "./types";

export type { CatalogInstallStep, CatalogProduct } from "./types";

/** Every product the cart can hold, in the order the catalog page shows them. */
export const CATALOG: readonly CatalogProduct[] = [aiSdk, cloud];

export const getProduct = (slug: string): CatalogProduct | undefined =>
  CATALOG.find((product) => product.slug === slug);

export const isProductSlug = (slug: string) =>
  CATALOG.some((product) => product.slug === slug);

/** Keeps catalog order and drops unknown or repeated slugs. */
export const resolveProducts = (
  slugs: readonly string[],
): readonly CatalogProduct[] =>
  CATALOG.filter((product) => slugs.includes(product.slug));

export const CATALOG_KIND_LABELS: Record<CatalogProduct["kind"], string> = {
  library: "Library",
  service: "Service",
};
