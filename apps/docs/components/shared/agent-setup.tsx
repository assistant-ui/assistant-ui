"use client";

import { BotIcon } from "lucide-react";
import { AddToCartButton } from "@/components/pages/catalog/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/components/shared/checkout-provider";
import { useBeginSetup } from "@/components/shared/setup-navigation";
import { getCatalogItem } from "@/lib/catalog";

/** Docs banner that hands the page's setup to the reader's coding agent. */
export function AgentSetup({ product: slug }: { product: string }) {
  const product = getCatalogItem(slug);
  const checkout = useCheckout();
  const beginSetup = useBeginSetup();
  if (product === undefined) return null;

  return (
    <aside
      aria-label="Set up with your coding agent"
      className="not-prose border-foreground/15 bg-muted/40 my-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border px-4 py-3 text-sm"
    >
      <BotIcon aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 basis-56">
        You can also use your coding agent to set this up.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {product.purchase === "cart" ? (
          <AddToCartButton
            slug={product.slug}
            name={product.name}
            variant="outline"
          />
        ) : null}
        <Button size="sm" onClick={() => beginSetup([product.slug])}>
          {checkout ? "Continue setup" : "Begin setup"}
        </Button>
      </div>
    </aside>
  );
}
