const configured = process.env.NEXT_PUBLIC_CHECKOUT_URL?.trim().replace(
  /\/+$/,
  "",
);

/** The agent checkout worker, or `null` when this build has none and the shop stays hidden. */
export const CHECKOUT_BASE_URL: string | null =
  configured ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8791" : null);

export const checkoutEnabled = CHECKOUT_BASE_URL !== null;
