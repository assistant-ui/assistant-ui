"use client";

import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { setCartOpen, toggleCartItem, useCart, type CartItem } from "./store";

export function CartToggle({ item }: { item: CartItem }) {
  const inCart = useCart().some((entry) => entry.slug === item.slug);
  const Icon = inCart ? CheckIcon : ShoppingCartIcon;

  return (
    <TooltipIconButton
      tooltip={inCart ? "Remove from cart" : "Add to cart"}
      aria-pressed={inCart}
      aria-label={
        inCart ? `Remove ${item.title} from cart` : `Add ${item.title} to cart`
      }
      onClick={() => {
        if (!toggleCartItem(item)) return;
        toast.success(`${item.title} added to cart.`, {
          action: { label: "View cart", onClick: () => setCartOpen(true) },
        });
      }}
      className={cn(
        "-my-1 shrink-0 self-center",
        inCart ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
    </TooltipIconButton>
  );
}
