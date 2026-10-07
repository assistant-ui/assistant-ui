"use client";

import {
  clearCart,
  getCart,
  getCartEntries,
  mergeIntoCart,
  getCartInstructions,
  setCartInstructions,
} from "@/lib/catalog/cart-store";
import {
  cartEntrySlug,
  configuredToolInstructions,
} from "@/lib/catalog/agent-tool-config";
import {
  endCheckout,
  getCheckoutSession,
  startCheckout,
} from "@/lib/checkout/session-store";

/** Moves the cart into a new checkout; the cart is empty afterwards. */
export const checkoutCart = () => {
  const running = getCheckoutSession();
  if (running !== null) return running;
  const entries = getCartEntries();
  if (entries.includes("agent-tools")) return null;
  const draft = getCartInstructions();
  const tools = configuredToolInstructions(entries);
  const session = startCheckout(
    getCart(),
    [draft.trim(), tools].filter(Boolean).join("\n\n"),
    {
      fromCart: true,
      ...(tools && { cartEntries: entries, cartInstructions: draft }),
    },
  );
  if (session !== null) clearCart();
  return session;
};

/** Ends the checkout; products that came out of the cart return to it. */
export const abandonCheckout = () => {
  const session = getCheckoutSession();
  if (session === null) return;
  endCheckout();
  if (!session.fromCart) return;
  const entries = session.cartEntries ?? session.products;
  mergeIntoCart([
    ...entries,
    ...session.products.filter(
      (slug) => !entries.some((entry) => cartEntrySlug(entry) === slug),
    ),
  ]);
  const instructions = session.cartInstructions ?? session.instructions;
  if (!getCartInstructions() && instructions) setCartInstructions(instructions);
};

/** Ends a finished checkout; its products stay installed, not in the cart. */
export const finishCheckout = endCheckout;
