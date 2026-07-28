import { resource, type ResourceElement } from "@assistant-ui/tap";
import { useEffect, useRef } from "react";
import type {
  AssistantClient,
  ClientNames,
  AssistantClientAccessor,
  ClientMeta,
} from "./types/client";
import { useAui } from "./useAui";
import { useAuiState } from "./useAuiState";

export declare const derivedKey: unique symbol;

type DerivedInstance<K extends ClientNames> = ReturnType<
  AssistantClientAccessor<K>
>;

// Identified by splitClients via `hook === useDerived`. Mounted by useAui's
// derived resolver: the selector resolves under subscription, and a stale
// scope keeps its committed instance until the parent reconciles it away.
export const useDerived = <K extends ClientNames>({
  get,
}: Derived.Props<K>): DerivedInstance<K> => {
  const aui = useAui();
  const boundRef = useRef<DerivedInstance<K> | null>(null);

  const instance = useAuiState(() => {
    const bound = boundRef.current;
    if (!bound) return get(aui);
    try {
      return get(aui);
    } catch {
      return bound;
    }
  });

  if (boundRef.current === null) boundRef.current = instance;
  useEffect(() => {
    boundRef.current = instance;
  });

  return instance;
};

/**
 * Creates a derived client field that references a client from a parent scope.
 * The resolved instance is bound into the client returned by `useAui`; a
 * structural change (the scope resolving to a different instance) produces a
 * new client through a React re-render.
 *
 * IMPORTANT: The `get` callback must return a client that was created via
 * `useClientResource` (or `useClientLookup`/`useClientList` which use it internally).
 * This is required for event scoping to work correctly.
 *
 * @example
 * ```typescript
 * const aui = useAui({
 *   message: Derived({
 *     source: "thread",
 *     query: { index: 0 },
 *     get: (aui) => aui.thread().message({ index: 0 }),
 *   }),
 * });
 * ```
 */
export const Derived = resource(useDerived) as unknown as <
  K extends ClientNames,
>(
  config: Derived.Props<K>,
) => DerivedElement<K>;

export type DerivedElement<K extends ClientNames> = ResourceElement<{
  [derivedKey]: K;
}>;

export namespace Derived {
  /**
   * Props passed to a derived client resource element.
   */
  export type Props<K extends ClientNames> = {
    get: (client: AssistantClient) => ReturnType<AssistantClientAccessor<K>>;
  } & ClientMeta<K>;
}
