import { useTapContext } from "../core/context";

/**
 * Reads a resource context from inside a resource render, the tap equivalent of
 * React's `use(Context)`. Only resource contexts are supported.
 */
export const use = (usable: unknown): unknown => {
  return useTapContext(usable as never);
};
