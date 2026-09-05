import {
  useSyncExternalStore,
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { AssistantState } from "./types/client";
import { useAui } from "./useAui";
import {
  collectAssistantStateDependencies,
  getProxiedAssistantState,
} from "./utils/proxied-assistant-state";
import {
  subscribeToClientDependency,
  type ClientDependency,
} from "./useClientResource";
import { useShallowStable } from "./utils/useShallowStable";

/**
 * Subscribes to a slice of {@link AssistantState} and re-renders the
 * component whenever that slice changes.
 *
 * Store notifications from unread scopes do not call the `selector` when
 * every selected client supports scoped subscriptions. React still calls it
 * during component renders, and clients without scoped subscriptions fall
 * back to broad store notifications. Its return value is compared by
 * `Object.is`, and the component re-renders only when the selected slice
 * changes. Returning the entire state object is not
 * supported and throws at runtime — select a specific field instead, or
 * compose multiple `useAuiState` calls. Returning a new object or array
 * literal, including spreading `s.thread` into a new object, causes a
 * re-render on every store update; either select primitives or return a
 * memoized reference.
 *
 * Scopes that may be unavailable can be read via `s.optional.<scope>`,
 * which resolves to `undefined` instead of throwing.
 *
 * @param selector - Pure function that derives a value from the current
 *   assistant state. Should be cheap and referentially stable for equal
 *   inputs (plain field reads, primitives, or memoized values).
 * @returns The currently selected slice.
 *
 * @example
 * ```tsx
 * // Disable a button while a run is in flight.
 * const isRunning = useAuiState((s) => s.thread.isRunning);
 * ```
 *
 * @example
 * ```tsx
 * // Prefer multiple selectors over an inline object literal, which would
 * // create a new reference on every render.
 * const text = useAuiState((s) => s.composer.text);
 * const canSend = useAuiState((s) => s.composer.canSend);
 * ```
 */
export const useAuiState = <T>(selector: (state: AssistantState) => T): T =>
  useAuiStateImpl(selector);

const useAuiStateImpl = <T>(
  selector: (state: AssistantState) => T,
  providedDependencies?: readonly ClientDependency[],
): T => {
  const aui = useAui();
  const proxiedState = getProxiedAssistantState(aui);
  const selectorRef = useRef(selector);
  useEffect(() => {
    selectorRef.current = selector;
  }, [selector]);
  const tracksDynamicDependencies = providedDependencies === undefined;
  const dependencies = useShallowStable(
    providedDependencies ??
      collectAssistantStateDependencies(() => selector(proxiedState))
        .dependencies,
  );
  const subscribe = useMemo(() => {
    return (callback: () => void) => {
      let active = true;
      let subscribedDependencies = dependencies;
      const directSubscriptions = new Map<ClientDependency, () => void>();
      let broadUnsubscribe: (() => void) | undefined;

      const clearSubscriptions = () => {
        for (const unsubscribe of directSubscriptions.values()) unsubscribe();
        directSubscriptions.clear();
        broadUnsubscribe?.();
        broadUnsubscribe = undefined;
      };

      const subscribeToDependencies = (
        nextDependencies: readonly ClientDependency[],
      ) => {
        subscribedDependencies = nextDependencies;

        if (nextDependencies.length === 0) {
          clearSubscriptions();
          broadUnsubscribe = aui.subscribe(handleChange);
          return;
        }

        const addedDependencies: ClientDependency[] = [];
        for (const dependency of nextDependencies) {
          if (directSubscriptions.has(dependency)) continue;
          const unsubscribe = subscribeToClientDependency(
            dependency,
            handleChange,
          );
          if (!unsubscribe) {
            for (const addedDependency of addedDependencies) {
              directSubscriptions.get(addedDependency)!();
              directSubscriptions.delete(addedDependency);
            }
            clearSubscriptions();
            broadUnsubscribe = aui.subscribe(handleChange);
            return;
          }
          directSubscriptions.set(dependency, unsubscribe);
          addedDependencies.push(dependency);
        }

        const nextDependencySet = new Set(nextDependencies);
        for (const [dependency, unsubscribe] of directSubscriptions) {
          if (!nextDependencySet.has(dependency)) {
            unsubscribe();
            directSubscriptions.delete(dependency);
          }
        }
        broadUnsubscribe?.();
        broadUnsubscribe = undefined;
      };

      const handleChange = () => {
        if (!active) return;
        if (tracksDynamicDependencies) {
          const nextDependencies = collectAssistantStateDependencies(() =>
            selectorRef.current(proxiedState),
          ).dependencies;
          const dependenciesChanged =
            nextDependencies.length !== subscribedDependencies.length ||
            nextDependencies.some(
              (dependency, index) =>
                dependency !== subscribedDependencies[index],
            );
          if (dependenciesChanged) {
            // Refresh the read path before React can suppress an equal snapshot.
            subscribeToDependencies(nextDependencies);
          }
        }
        callback();
      };

      subscribeToDependencies(dependencies);

      return () => {
        active = false;
        clearSubscriptions();
      };
    };
  }, [aui, dependencies, proxiedState, tracksDynamicDependencies]);

  const slice = useSyncExternalStore(
    subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );

  if (
    typeof slice === "object" &&
    slice !== null &&
    ((slice as unknown) === proxiedState ||
      (slice as unknown) === proxiedState.optional)
  ) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  useDebugValue(slice);

  return slice;
};

export const useAuiStateWithDependencies = <T>(
  selector: (state: AssistantState) => T,
  dependencies: readonly ClientDependency[] | undefined,
): T => useAuiStateImpl(selector, dependencies);
