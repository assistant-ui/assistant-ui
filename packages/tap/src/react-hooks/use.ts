import { useTapContext } from "../core/context";

/**
 * Reads a context from inside a resource render, the tap equivalent of React's
 * `use(Context)` / `useContext(Context)`. Accepts React contexts.
 */
export const use = (usable: unknown): unknown => useTapContext(usable as never);
