"use client";

import { endCheckout, joinAgentLink } from "@/lib/checkout/session-store";

/** Ends the setup the user left. */
export const abandonCheckout = endCheckout;

/** Ends a finished setup. */
export const finishCheckout = endCheckout;

/**
 * Connects to the setup a coding agent opened this page on, once the user
 * confirmed it. A running setup on another link ends.
 */
export const connectAgentSetup = (link: string, setup?: string) =>
  joinAgentLink(link, setup);
