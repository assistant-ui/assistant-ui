"use client";

import Link from "next/link";
import { AddToCartButton } from "./add-to-cart-button";
import {
  setCartInstructions,
  useCartInstructions,
  useInCart,
} from "@/lib/catalog/cart-store";
import { checkoutEnabled } from "@/lib/checkout/config";

export function StatewireSetup() {
  const instructions = useCartInstructions();
  const inCart = useInCart("statewire");
  if (!checkoutEnabled) return null;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <label htmlFor="statewire-build" className="text-base font-medium">
        What do you want to build?
      </label>
      <p
        id="statewire-build-help"
        className="text-muted-foreground text-base sm:text-sm"
      >
        Your agent uses this brief to build with Statewire and Durable Objects.
      </p>
      <textarea
        id="statewire-build"
        name="statewire-build"
        aria-describedby="statewire-build-help"
        placeholder="A shared board, a multiplayer game, or a collaborative workflow…"
        value={instructions}
        onChange={(event) => setCartInstructions(event.target.value)}
        rows={4}
        className="border-input placeholder:text-muted-foreground focus-visible:ring-ring rounded-control w-full resize-y border bg-transparent px-3 py-3 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
      />
      <div className="flex flex-wrap items-center gap-4">
        <AddToCartButton slug="statewire" name="Statewire" size="default" />
        {inCart ? (
          <Link
            href="/components/cart"
            className="text-base underline underline-offset-4 sm:text-sm"
          >
            Continue to setup
          </Link>
        ) : null}
      </div>
    </div>
  );
}
