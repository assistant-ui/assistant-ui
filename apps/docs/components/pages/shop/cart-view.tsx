"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon, BotIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SetupLink } from "@/components/shared/setup-navigation";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { useCheckout } from "@/components/shared/checkout-provider";
import { typeDeck, typePage } from "@/components/shared/type";
import {
  estimateAgentMinutes,
  formatMinutes,
  resolveProducts,
} from "@/lib/catalog";
import { parseCartItems } from "@/lib/catalog/install-prompt";
import {
  removeFromCart,
  replaceCart,
  useCart,
  useCartInstructions,
  setCartInstructions,
} from "@/lib/catalog/cart-store";
import {
  SHIPPING_METHODS,
  setShippingMethod,
  useShippingMethod,
} from "@/lib/catalog/shipping-store";
import { checkoutCart } from "@/lib/checkout/flow";
import { useCheckoutSession } from "@/lib/checkout/session-store";
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
        Setup is in progress. Finish it before starting another one.
      </span>
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<SetupLink />}
      >
        Continue setup
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
  const session = useCheckoutSession();
  const products = resolveProducts(slugs);
  const shipping = useShippingMethod();
  const instructions = useCartInstructions();

  // A shared link restores the cart it describes, then the cart owns the state
  // so removing an item here does not resurrect it on the next render.
  useEffect(() => {
    if (!hydrated || session !== null) return;
    const linked = resolveProducts(parseCartItems(linkedItems)).map(
      (product) => product.slug,
    );
    if (linked.length > 0) replaceCart(linked);
  }, [hydrated, linkedItems, session]);

  if (!hydrated) return null;

  if (products.length === 0) {
    return (
      <div className="max-w-xl">
        {checkout ? <ActiveCheckoutBanner /> : null}
        <h1 className={typePage}>Your cart is empty.</h1>
        <p className={cn("mt-4", typeDeck)}>
          Open a product in the shop and add it here. Everything is free.
        </p>
        <Button
          nativeButton={false}
          className="mt-8"
          render={<Link href="/shop" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Browse the shop
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
                  href={product.href}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Remove ${product.name}`}
                  onClick={() => removeFromCart(product.slug)}
                  className="mt-3"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Remove
                </Button>
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

        <details className="group/instructions mt-6">
          <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex w-fit cursor-pointer list-none items-center gap-2 rounded-md py-2 text-sm focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <PlusIcon
              aria-hidden="true"
              className="size-4 shrink-0 group-open/instructions:rotate-45"
            />
            {instructions.trim()
              ? "Edit special instructions"
              : "Add special instructions"}
          </summary>
          <div className="pt-2">
            <p
              id="setup-instructions-help"
              className="text-muted-foreground text-base sm:text-sm"
            >
              Your agent will inspect your project and ask about anything it
              needs.
            </p>
            <textarea
              name="setup-instructions"
              aria-label="Special instructions"
              aria-describedby="setup-instructions-help"
              placeholder="Leave this empty unless you have a very specific, unusual requirement."
              value={instructions}
              onChange={(event) => setCartInstructions(event.target.value)}
              rows={3}
              className="border-input placeholder:text-muted-foreground focus-visible:ring-ring mt-3 w-full resize-y rounded-xl border bg-transparent px-3 py-3 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
            />
          </div>
        </details>

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
            <dd>
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
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">ETA</dt>
            <dd className="tabular-nums">{estimate}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">$0.00</dd>
          </div>
        </dl>
        {checkout ? (
          <Button disabled className="mt-4 w-full">
            Start setup
          </Button>
        ) : (
          <Button
            nativeButton={false}
            className="mt-4 w-full"
            render={<SetupLink onClick={() => checkoutCart()} />}
          >
            Start setup
          </Button>
        )}
        <p className="text-muted-foreground mt-3 text-center text-sm">
          {checkout
            ? "Finish the current setup to start another."
            : "Your coding agent handles the setup."}
        </p>
      </aside>
    </div>
  );
}
