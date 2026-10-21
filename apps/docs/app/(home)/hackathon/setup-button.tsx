"use client";

import { AddToCartButton } from "@/components/pages/shop/add-to-cart-button";
import { getCatalogItem } from "@/lib/catalog";

export function SetupButton({ slug }: { slug: string }) {
  const product = getCatalogItem(slug);
  if (product === undefined) return null;
  return <AddToCartButton slug={product.slug} name={product.name} />;
}
