import { assistantUi } from "./products/assistant-ui";
import { cloud } from "./products/cloud";
import type { CatalogProduct } from "./types";

export type { CatalogInstallStep, CatalogProduct } from "./types";

/** Every product the cart can hold, in the order the catalog page shows them. */
export const CATALOG: readonly CatalogProduct[] = [assistantUi, cloud];

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

/** Summed agent-time bounds for a set of products, in minutes. */
export const estimateAgentMinutes = (
  products: readonly CatalogProduct[],
): [number, number] =>
  products.reduce<[number, number]>(
    ([low, high], product) => [
      low + product.agentMinutes[0],
      high + product.agentMinutes[1],
    ],
    [0, 0],
  );

export const formatMinutes = ([low, high]: readonly [number, number]) =>
  low === high ? `${low} min` : `${low}–${high} min`;
