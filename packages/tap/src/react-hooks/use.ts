import { isReadableTapContext, useTapContext } from "../core/context";

/**
 * Reads a context from inside a resource render, the tap equivalent of React's
 * `use(Context)` / `useContext(Context)`. Accepts React contexts.
 */
export const use = (usable: unknown): unknown => {
  if (!isReadableTapContext(usable))
    throw new Error("A tap resource's `use()` only accepts a tap context.");

  return useTapContext(usable as never);
};
