"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/components/shared/checkout-provider";
import { toggleCartItem, useInCart } from "@/lib/catalog/cart-store";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  slug,
  name,
  size = "sm",
  className,
}: {
  slug: string;
  name: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const inCart = useInCart(slug);
  const locked = useCheckout() !== null;

  return (
    <Button
      variant={inCart ? "outline" : "default"}
      size={size}
      aria-pressed={inCart}
      aria-label={inCart ? `Remove ${name} from cart` : `Add ${name} to cart`}
      disabled={locked}
      title={locked ? "End the running checkout to change the cart" : undefined}
      onClick={() => {
        analytics.catalog.cartToggled(slug, !inCart);
        toggleCartItem(slug);
      }}
      className={cn("min-w-28", className)}
    >
      {inCart ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <PlusIcon data-icon="inline-start" />
      )}
      {inCart ? "In cart" : "Add to cart"}
    </Button>
  );
}
