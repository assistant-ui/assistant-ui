"use client";

import {
  clearCart,
  getCart,
  mergeIntoCart,
  getCartInstructions,
  setCartInstructions,
} from "@/lib/catalog/cart-store";
import {
  endCheckout,
  getCheckoutSession,
  startCheckout,
} from "@/lib/checkout/session-store";

/** Moves the cart into a new checkout; the cart is empty afterwards. */
export const checkoutCart = () => {
  const running = getCheckoutSession();
  if (running !== null) return running;
  const session = startCheckout(getCart(), getCartInstructions(), {
    fromCart: true,
  });
  if (session !== null) clearCart();
  return session;
};

/** Ends the checkout; products that came out of the cart return to it. */
export const abandonCheckout = () => {
  const session = getCheckoutSession();
  if (session === null) return;
  endCheckout();
  if (!session.fromCart) return;
  mergeIntoCart(session.products);
  if (!getCartInstructions() && session.instructions)
    setCartInstructions(session.instructions);
};

/** Ends a finished checkout; its products stay installed, not in the cart. */
export const finishCheckout = endCheckout;
