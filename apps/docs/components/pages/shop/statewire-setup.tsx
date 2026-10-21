"use client";

import Link from "next/link";
import { AddToCartButton } from "./add-to-cart-button";
import {
  setCartInstructions,
  useCartInstructions,
  useInCart,
} from "@/lib/catalog/cart-store";
import { checkoutEnabled } from "@/lib/checkout/config";

const setupProducts = {
  statewire: {
    name: "Statewire",
    detail:
      "Your agent uses this brief to build with Statewire and Durable Objects.",
    placeholder:
      "A shared board, a multiplayer game, or a collaborative workflow…",
  },
  "harness-sdk": {
    name: "harness-sdk",
    detail:
      "Your agent uses this brief to build an AI chat with the alpha harness-sdk runtime.",
    placeholder:
      "A shared research assistant, a team chat, or an agent with tools…",
  },
};

function ProductSetup({ product }: { product: keyof typeof setupProducts }) {
  const copy = setupProducts[product];
  const fieldId = `${product}-build`;
  const instructions = useCartInstructions();
  const inCart = useInCart(product);
  if (!checkoutEnabled) return null;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <label htmlFor={fieldId} className="text-base font-medium">
        What do you want to build?
      </label>
      <p
        id={`${fieldId}-help`}
        className="text-muted-foreground text-base sm:text-sm"
      >
        {copy.detail}
      </p>
      <textarea
        id={fieldId}
        name={fieldId}
        aria-describedby={`${fieldId}-help`}
        placeholder={copy.placeholder}
        value={instructions}
        onChange={(event) => setCartInstructions(event.target.value)}
        rows={4}
        className="border-input placeholder:text-muted-foreground focus-visible:ring-ring rounded-control w-full resize-y border bg-transparent px-3 py-3 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
      />
      <div className="flex flex-wrap items-center gap-4">
        <AddToCartButton slug={product} name={copy.name} size="default" />
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

export function StatewireSetup() {
  return <ProductSetup product="statewire" />;
}

export function HarnessSetup() {
  return <ProductSetup product="harness-sdk" />;
}
