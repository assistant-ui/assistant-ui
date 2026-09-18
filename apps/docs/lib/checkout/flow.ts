"use client";

import { clearCart, getCart, mergeIntoCart } from "@/lib/catalog/cart-store";
import {
  endCheckout,
  getCheckoutSession,
  startCheckout,
} from "@/lib/checkout/session-store";

/** Moves the cart into a new checkout; the cart is empty afterwards. */
export const checkoutCart = () => {
  const running = getCheckoutSession();
  if (running !== null) return running;
  const session = startCheckout(getCart());
  if (session !== null) clearCart();
  return session;
};

/** Ends the checkout and returns its products to the cart. */
export const abandonCheckout = () => {
  const session = getCheckoutSession();
  if (session === null) return;
  endCheckout();
  mergeIntoCart(session.products);
};

/** Ends a finished checkout; its products stay installed, not in the cart. */
export const finishCheckout = endCheckout;
