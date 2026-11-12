"use client";

import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { setCartOpen, toggleCartSlug, useCartSlugs } from "./store";

export function CartToggle({ slug, title }: { slug: string; title: string }) {
  const inCart = useCartSlugs().includes(slug);
  const Icon = inCart ? CheckIcon : ShoppingCartIcon;

  return (
    <TooltipIconButton
      tooltip={inCart ? "Remove from cart" : "Add to cart"}
      aria-pressed={inCart}
      aria-label={`Add ${title} to cart`}
      onClick={() => {
        if (!toggleCartSlug(slug)) return;
        toast.success(`${title} added to cart.`, {
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
