"use client";

import {
  endCheckout,
  getCheckoutSession,
  joinAgentLink,
} from "@/lib/checkout/session-store";

/** Ends the checkout the user left. */
export const abandonCheckout = endCheckout;

/** Ends a finished checkout. */
export const finishCheckout = endCheckout;

/**
 * Connects to the setup a coding agent opened this page on, once the user
 * confirmed it. A different running setup ends first.
 */
export const connectAgentSetup = (link: string, setup?: string) => {
  const running = getCheckoutSession();
  if (running !== null && running.link !== link) abandonCheckout();
  return joinAgentLink(link, setup);
};
