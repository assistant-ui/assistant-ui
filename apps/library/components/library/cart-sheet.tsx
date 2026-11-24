"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  cartCommands,
  cartPrompt,
  getLibraryCategory,
} from "@/lib/library/catalog";
import { copyWithToast } from "./item-menu";
import { libraryCart, useCartItems } from "./library-context";

export const cartCountLabel = (count: number) =>
  `${count} ${count === 1 ? "item" : "items"}`;

export function CartSheet() {
  const cart = useCartItems();
  const cartOpen = libraryCart.useCartOpen();
  const commands = cartCommands(cart);

  return (
    <Sheet open={cartOpen} onOpenChange={libraryCart.setCartOpen}>
      <SheetContent className="gap-0">
        <SheetHeader>
          <SheetTitle>Cart</SheetTitle>
          <SheetDescription>
            {cart.length === 0
              ? "The cart is empty. Add an item from its menu."
              : cartCountLabel(cart.length)}
          </SheetDescription>
        </SheetHeader>
        {cart.length > 0 ? (
          <>
            <ul role="list" className="min-h-0 flex-1 overflow-y-auto px-2">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="hover:bg-foreground/[0.025] rounded-control flex items-center gap-2 py-1.5 ps-2 pe-1"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {getLibraryCategory(item.category).label}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.name} from cart`}
                    onClick={() => libraryCart.removeCartSlug(item.id)}
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </Button>
                </li>
              ))}
            </ul>
            <SheetFooter>
              {commands.length > 0 ? (
                <pre className="rounded-document bg-code-surface text-muted-foreground max-h-40 overflow-auto p-3 font-mono text-xs">
                  <code>{commands.join("\n")}</code>
                </pre>
              ) : null}
              {commands.length > 0 ? (
                <Button
                  onClick={() =>
                    copyWithToast(
                      commands.join("\n"),
                      commands.length === 1
                        ? "Install command copied."
                        : "Install commands copied.",
                    )
                  }
                >
                  {commands.length === 1
                    ? "Copy install command"
                    : "Copy install commands"}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() =>
                  copyWithToast(cartPrompt(cart), "Prompt copied.")
                }
              >
                Copy assistant-ui prompt
              </Button>
              <Button variant="ghost" onClick={libraryCart.clearCart}>
                Clear cart
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
