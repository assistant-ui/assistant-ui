"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleCartItem, useInCart } from "@/lib/catalog/cart-store";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  slug,
  name,
  size = "sm",
  variant = "default",
  className,
}: {
  slug: string;
  name: string;
  size?: "sm" | "default";
  /** The look while the product is not in the cart; in the cart it is always outlined. */
  variant?: "default" | "outline";
  className?: string;
}) {
  const inCart = useInCart(slug);

  return (
    <Button
      variant={inCart ? "outline" : variant}
      size={size}
      aria-pressed={inCart}
      aria-label={inCart ? `Remove ${name} from cart` : `Add ${name} to cart`}
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
