"use client";

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
  const slugs = useCart();
  const products = resolveProducts(slugs);
  if (products.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={`Cart, ${products.length} ${products.length === 1 ? "item" : "items"}`}
            className={cn(
              "animate-in fade-in-0 zoom-in-95 relative pr-2 pl-2 tabular-nums duration-200",
              className,
            )}
          />
        }
      >
        <ShoppingBagIcon data-icon="inline-start" />
        <span className="max-md:sr-only">Cart</span>
        <span className="bg-foreground text-background grid size-4 place-items-center rounded-full text-[0.625rem] font-medium">
          {products.length}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 gap-0 p-1">
        <ul role="list" className="flex flex-col py-1">
          {products.map((product) => (
            <li
              key={product.slug}
              className="group/item flex items-center gap-2 rounded-md py-1.5 pr-1 pl-2.5"
            >
              <Link
                href={`/catalog/${product.slug}`}
                className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
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
                className="text-muted-foreground hover:text-foreground hover:bg-muted relative grid size-6 shrink-0 place-items-center rounded-md"
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
        <div className="border-foreground/10 flex items-center justify-between border-t px-2.5 pt-2.5 pb-1.5">
          <span className="text-sm">Total</span>
          <span className="pr-8 text-sm font-medium tabular-nums">$0.00</span>
        </div>
        <div className="p-1">
          <Button
            size="sm"
            nativeButton={false}
            className="w-full"
            render={<Link href="/catalog/cart" />}
          >
            Checkout
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
