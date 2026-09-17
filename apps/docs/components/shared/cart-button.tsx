"use client";

import Link from "next/link";
import { ArrowRightIcon, ShoppingBagIcon, XIcon } from "lucide-react";
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
      <PopoverContent align="end" sideOffset={8} className="w-80 gap-0 p-0">
        <div className="flex items-baseline justify-between px-3.5 pt-3 pb-2">
          <span className="text-muted-foreground font-mono text-[0.6875rem]">
            Cart
          </span>
          <span className="text-muted-foreground font-mono text-[0.6875rem] tabular-nums">
            {products.length} free
          </span>
        </div>
        <ul role="list" className="divide-foreground/10 divide-y">
          {products.map((product) => (
            <li
              key={product.slug}
              className="flex items-start gap-3 px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/catalog/${product.slug}`}
                  className="text-foreground block truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {product.name}
                </Link>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug">
                  {product.tagline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFromCart(product.slug)}
                aria-label={`Remove ${product.name}`}
                className="text-muted-foreground hover:text-foreground hover:bg-muted relative -mr-1 grid size-6 shrink-0 place-items-center rounded-md"
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
        <div className="border-foreground/10 border-t p-2">
          <Button
            size="sm"
            nativeButton={false}
            className="w-full justify-between"
            render={<Link href="/catalog/cart" />}
          >
            Install everything
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
