"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBagIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { removeFromCart, useCart } from "@/lib/catalog/cart-store";
import { resolveProducts } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Header cart. Renders nothing until the cart holds at least one product. */
export function CartButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const slugs = useCart();
  const products = resolveProducts(slugs);
  if (products.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={`Cart, ${products.length} ${products.length === 1 ? "item" : "items"}`}
            className={cn(
              "animate-in fade-in-0 zoom-in-95 duration-200",
              className,
            )}
          />
        }
      >
        <ShoppingBagIcon data-icon="inline-start" />
        <span className="max-md:sr-only">Cart</span>
        <span className="bg-foreground text-background grid size-4.5 place-items-center rounded-full text-[11px] leading-none font-medium tabular-nums">
          {products.length}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 gap-0 p-0">
        <ul role="list" className="flex flex-col p-2">
          {products.map((product) => (
            <li
              key={product.slug}
              className="grid grid-cols-[minmax(0,1fr)_auto_1.5rem] items-center gap-3 py-2 pr-1 pl-2"
            >
              <Link
                href={`/catalog/${product.slug}`}
                onClick={() => setOpen(false)}
                className="truncate text-sm underline-offset-4 hover:underline"
              >
                {product.name}
              </Link>
              <span className="text-muted-foreground text-sm tabular-nums">
                $0.00
              </span>
              <button
                type="button"
                onClick={() => removeFromCart(product.slug)}
                aria-label={`Remove ${product.name}`}
                className="text-muted-foreground hover:text-foreground hover:bg-muted relative grid size-6 place-items-center rounded-md"
              >
                <XIcon className="size-3.5" />
                <span
                  aria-hidden
                  className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
                />
              </button>
            </li>
          ))}
        </ul>
        <p className="border-foreground/10 grid grid-cols-[minmax(0,1fr)_auto_1.5rem] items-center gap-3 border-t py-3 pr-3 pl-4 text-sm font-medium">
          <span>Total</span>
          <span className="tabular-nums">$0.00</span>
        </p>
        <div className="px-4 pb-4">
          <Button
            variant="outline"
            nativeButton={false}
            className="w-full"
            render={
              <Link href="/catalog/cart" onClick={() => setOpen(false)} />
            }
          >
            View cart
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
