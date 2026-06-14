import { isReadableTapContext, useTapContext } from "../core/context";

/**
 * Reads a resource context from inside a resource render, the tap equivalent of
 * React's `use(Context)`. Only resource contexts are supported.
 */
export const use = (usable: unknown): unknown => {
  if (!isReadableTapContext(usable))
    throw new Error("A tap resource's `use()` only accepts a tap context.");

  return useTapContext(usable as never);
};
