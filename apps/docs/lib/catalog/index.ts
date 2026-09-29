import { agentTools } from "./products/agent-tools";
import { assistantUi } from "./products/assistant-ui";
import { cloud } from "./products/cloud";
import { ELEMENT_PRODUCTS } from "./products/elements";
import { GUIDE_PRODUCTS } from "./products/guides";
import { reactApp } from "./products/react-app";
import { shopEnabled } from "@/lib/checkout/config";
import type { CatalogItem, CatalogProduct } from "./types";

export type { CatalogInstallStep, CatalogItem, CatalogProduct } from "./types";

/** The products with a page under /shop, in the order the shop lists them. Without the shop, only the main installer exists. */
export const CATALOG: readonly CatalogProduct[] = shopEnabled
  ? [assistantUi, cloud, agentTools]
  : [assistantUi];

/** Everything a setup session can install, in install order. */
export const CATALOG_ITEMS: readonly CatalogItem[] = [
  reactApp,
  ...CATALOG,
  ...(shopEnabled ? [...GUIDE_PRODUCTS, ...ELEMENT_PRODUCTS] : []),
];

const bySlug = new Map(CATALOG_ITEMS.map((item) => [item.slug, item]));

export const getProduct = (slug: string): CatalogProduct | undefined =>
  CATALOG.find((product) => product.slug === slug);

export const getCatalogItem = (slug: string): CatalogItem | undefined =>
  bySlug.get(slug);

/** True for anything a setup session can install. */
export const isProductSlug = (slug: string) => bySlug.has(slug);

/** True for products the cart can hold; "setup" products start on their own. */
export const isCartSlug = (slug: string) =>
  bySlug.get(slug)?.purchase === "cart";

/** Keeps catalog order and drops unknown or repeated slugs. */
export const resolveProducts = (
  slugs: readonly string[],
): readonly CatalogItem[] =>
  CATALOG_ITEMS.filter((product) => slugs.includes(product.slug));

export const CATALOG_KIND_LABELS: Record<CatalogProduct["kind"], string> = {
  library: "Library",
  service: "Service",
};

/** Summed agent-time bounds for a set of products, in minutes. */
export const estimateAgentMinutes = (
  products: readonly CatalogItem[],
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
