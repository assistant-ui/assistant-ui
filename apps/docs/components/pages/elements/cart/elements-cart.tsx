"use client";

import Link from "next/link";
import { ShoppingCartIcon, XIcon } from "lucide-react";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { ShadcnInstallTabs } from "@/components/pages/docs/fumadocs/install/package-manager-tabs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  cartRegistryNames,
  clearCart,
  removeCartItem,
  setCartOpen,
  useCart,
  useCartOpen,
} from "./store";

const countLabel = (count: number) =>
  `${count} ${count === 1 ? "element" : "elements"}`;

export function ElementsCart() {
  const cart = useCart();
  const open = useCartOpen();
  const { open: assistantOpen } = useAssistantPanel();
  const count = cart.length;

  return (
    <>
      <Sheet open={open} onOpenChange={setCartOpen}>
        <SheetContent className="gap-0">
          <SheetHeader>
            <SheetTitle>Cart</SheetTitle>
            <SheetDescription>
              {count === 0
                ? "The cart is empty. Add an element from its card."
                : countLabel(count)}
            </SheetDescription>
          </SheetHeader>
          {count > 0 ? (
            <>
              <ul role="list" className="min-h-0 flex-1 overflow-y-auto px-2">
                {cart.map((item) => (
                  <li
                    key={item.slug}
                    className="hover:bg-foreground/[0.025] rounded-control flex items-center gap-2 py-1.5 ps-2 pe-1"
                  >
                    <Link
                      href={`/elements/${item.slug}`}
                      className="flex min-w-0 flex-1 flex-col"
                    >
                      <span className="truncate text-[13.5px] font-medium">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground truncate font-mono text-xs">
                        @assistant-ui/{item.registryName}
                      </span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.title} from cart`}
                      onClick={() => removeCartItem(item.slug)}
                    >
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ul>
              <SheetFooter className="gap-0 pt-0">
                <ShadcnInstallTabs
                  urls={cartRegistryNames(cart).map(
                    (name) => `"@assistant-ui/${name}"`,
                  )}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={clearCart}
                >
                  Clear cart
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      {assistantOpen ? null : (
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close cart" : `Open cart, ${countLabel(count)}`}
          onClick={() => setCartOpen(!open)}
          className={cn(
            "border-border/60 bg-background hover:border-border rounded-capsule fixed bottom-5 z-[60] grid size-12 place-items-center border transition-[right,border-color] duration-200 ease-in-out motion-reduce:transition-none [body:has([data-ask-ai-ball])_&]:bottom-20",
            open ? "right-[calc(min(75vw,24rem)+1.25rem)]" : "right-5",
          )}
        >
          <ShoppingCartIcon aria-hidden className="text-foreground/80 size-5" />
          {count > 0 ? (
            <span
              aria-hidden
              className="bg-foreground text-background rounded-capsule absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center px-1 text-xs font-medium tabular-nums"
            >
              {count}
            </span>
          ) : null}
        </button>
      )}
    </>
  );
}
