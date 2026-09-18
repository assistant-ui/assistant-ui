"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon, BotIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { useCheckout } from "@/components/shared/checkout-provider";
import { typeDeck, typePage } from "@/components/shared/type";
import {
  estimateAgentMinutes,
  formatMinutes,
  resolveProducts,
} from "@/lib/catalog";
import { parseCartItems } from "@/lib/catalog/install-prompt";
import { removeFromCart, replaceCart, useCart } from "@/lib/catalog/cart-store";
import {
  SHIPPING_METHODS,
  setShippingMethod,
  useShippingMethod,
} from "@/lib/catalog/shipping-store";
import { checkoutCart } from "@/lib/checkout/flow";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

const shippingOptions = SHIPPING_METHODS.map((method) => ({
  value: method.id,
  label: method.name,
}));

function ActiveCheckoutBanner() {
  return (
    <div
      role="status"
      className="border-foreground/15 bg-muted/40 mb-8 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <BotIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        You have a checkout in progress. Finish it before starting another one.
      </span>
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<Link href="/shop/checkout" />}
      >
        View checkout
      </Button>
    </div>
  );
}

export function CartView() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const linkedItems = params.get("items");
  const slugs = useCart();
  const checkout = useCheckout();
  const products = resolveProducts(slugs);
  const shipping = useShippingMethod();

  // A shared link restores the cart it describes, then the cart owns the state
  // so removing an item here does not resurrect it on the next render.
  useEffect(() => {
    const linked = parseCartItems(linkedItems);
    if (linked.length > 0) replaceCart(linked);
  }, [linkedItems]);

  if (hydrated && products.length === 0) {
    return (
      <div className="max-w-xl">
        {checkout ? <ActiveCheckoutBanner /> : null}
        <h1 className={typePage}>Your cart is empty.</h1>
        <p className={cn("mt-4", typeDeck)}>
          Open a product in the catalog and add it here. Everything is free.
        </p>
        <Button
          nativeButton={false}
          className="mt-8"
          render={<Link href="/shop" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Browse the catalog
        </Button>
      </div>
    );
  }

  const estimate = formatMinutes(estimateAgentMinutes(products));

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
      <div>
        {checkout ? <ActiveCheckoutBanner /> : null}
        <h1 className={typePage}>Cart</h1>
        <ul
          role="list"
          className="divide-foreground/10 border-foreground/10 mt-8 divide-y border-y"
        >
          {products.map((product) => (
            <li
              key={product.slug}
              className="group/navlink grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-5 gap-y-3 py-6 sm:grid-cols-[auto_minmax(0,1fr)_5rem_4rem] sm:gap-x-8"
            >
              <NavGlyph kind={product.glyph} />
              <div className="min-w-0">
                <Link
                  href={`/shop/${product.slug}`}
                  className="text-[0.9375rem] font-medium underline-offset-4 hover:underline"
                >
                  {product.name}
                </Link>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {product.tagline}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Agent time {formatMinutes(product.agentMinutes)}
                </p>
                <button
                  type="button"
                  onClick={() => removeFromCart(product.slug)}
                  className="text-muted-foreground hover:text-foreground mt-3 text-sm underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              </div>
              <p className="text-muted-foreground text-sm tabular-nums max-sm:col-start-2 sm:text-right">
                Qty 1
              </p>
              <p className="text-sm tabular-nums max-sm:col-start-3 max-sm:row-start-1 sm:text-right">
                $0.00
              </p>
            </li>
          ))}
        </ul>

        <Link
          href="/shop"
          className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          Continue browsing
        </Link>
      </div>

      <aside
        aria-labelledby="summary-heading"
        className="border-foreground/10 rounded-document h-fit border p-6 lg:mt-14"
      >
        <h2 id="summary-heading" className="text-base font-medium">
          Summary
        </h2>
        <dl className="divide-foreground/10 mt-4 divide-y text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">$0.00</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-muted-foreground">
              <label htmlFor="shipping-method">Shipping</label>
            </dt>
            <dd className="flex items-center gap-3">
              <Select
                value={shipping.id}
                onValueChange={(id) => {
                  if (id !== null) setShippingMethod(id);
                }}
                items={shippingOptions}
              >
                <SelectTrigger
                  id="shipping-method"
                  size="sm"
                  className="h-7 border-0 bg-transparent px-2 shadow-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {SHIPPING_METHODS.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="tabular-nums">$0.00</span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Delivery by agent</dt>
            <dd className="tabular-nums">{estimate}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">$0.00</dd>
          </div>
        </dl>
        {checkout ? (
          <Button disabled className="mt-4 w-full">
            Checkout
          </Button>
        ) : (
          <Button
            nativeButton={false}
            className="mt-4 w-full"
            render={
              <Link href="/shop/checkout" onClick={() => checkoutCart()} />
            }
          >
            Checkout
          </Button>
        )}
        <p className="text-muted-foreground mt-3 text-center text-sm">
          {checkout
            ? "Finish the running checkout to start another."
            : "Checkout hands the install to your coding agent."}
        </p>
      </aside>
    </div>
  );
}
