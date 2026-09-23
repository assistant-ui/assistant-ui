"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NavGlyph } from "@/components/shared/nav-glyph";
import {
  inputCardClassName,
  useInputActions,
} from "@/components/pages/shop/input-shared";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { getCatalogItem } from "@/lib/catalog";
import { cartUrl } from "@/lib/catalog/install-prompt";
import type { Checkout } from "@/lib/checkout/protocol";

export function ProductInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const product = getCatalogItem(input.product ?? "");
  const [adding, setAdding] = useState(false);
  const { busy, dismiss } = useInputActions(input, checkout);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!product) return;
    setAdding(true);
    try {
      await checkout.commands["checkout/add-product"]({
        inputId: input.id,
        product: {
          slug: product.slug,
          name: product.name,
          guide: `${window.location.origin}${cartUrl([product.slug], { markdown: true })}`,
        },
      });
    } catch {
      toast.error("Could not add the product");
      setAdding(false);
    }
  };
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className={inputCardClassName}
    >
      <fieldset
        disabled={busy || adding}
        className="flex min-w-0 flex-col gap-3"
      >
        <legend className="font-display mb-3 max-w-full text-lg leading-snug font-medium [overflow-wrap:anywhere]">
          {input.prompt}
        </legend>
        {product ? (
          <div className="border-foreground/15 bg-background flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <NavGlyph kind={product.glyph} size="sm" />
            <div className="min-w-0">
              <p className="text-base font-medium sm:text-sm">{product.name}</p>
              <p className="text-muted-foreground text-sm">{product.tagline}</p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            The shop has no product named “{input.product}”.
          </p>
        )}
      </fieldset>
      <div className="mt-4 flex gap-2">
        {product ? (
          <Button type="submit" disabled={busy || adding}>
            Add to this setup
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={busy || adding}
          onClick={dismiss}
        >
          {product ? "Not now" : "Dismiss"}
        </Button>
      </div>
    </form>
  );
}
