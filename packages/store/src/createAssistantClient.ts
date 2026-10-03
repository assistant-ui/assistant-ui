"use client";

import { createTapRoot, flushTapSync } from "@assistant-ui/tap";
import { useReducer, useSyncExternalStore } from "react";

import type { AssistantClient, Unsubscribe } from "./types/client";
import type { AuiConfig } from "./AuiConfig";
import { DefaultAssistantClient } from "./utils/react-assistant-context";
import { createNotificationManager } from "./utils/NotificationManager";
import { getClientId } from "./utils/client-accessor";
import { useDestroySignalProvider } from "./utils/destroy-signal-context";
import {
  applyTransformScopes,
  isDerivedElement,
  useAuiRoot,
  type ClientRef,
  type ScopeEntry,
} from "./useAui";

/**
 * A live view onto an `AssistantClient` whose identity may change over time.
 *
 * `getClient` returns the current client; `subscribe` fires after every state
 * or structural update. An {@link AssistantClientHandle} is itself a source,
 * so handles nest directly as the `parent` of another handle.
 */
export type AssistantClientSource = {
  getClient(): AssistantClient;
  subscribe(listener: () => void): Unsubscribe;
};

export type AssistantClientHandle = AssistantClientSource & {
  destroy(): void;
};

/**
 * A live view onto a config whose entries may change over time.
 *
 * `getConfig` returns the current config; `subscribe` fires after every
 * change. The root re-reads the config on each notification: a scope that
 * keeps its key keeps its state while its element args update, and added or
 * removed keys mount and unmount their scopes.
 */
export type AssistantConfigSource = {
  getConfig(): AuiConfig.Input;
  subscribe(listener: () => void): Unsubscribe;
};

// A config maps scope names to resource elements; only a source carries a
// getConfig function
const isConfigSource = (
  config: AuiConfig.Input | AssistantConfigSource,
): config is AssistantConfigSource =>
  typeof (config as AssistantConfigSource).getConfig === "function";

const NO_OP_SUBSCRIBE = () => () => {};

// getConfig doubles as a useSyncExternalStore getSnapshot, which requires a
// stable result between notifications; a live source's thunk may build its
// config inline, so the result is cached until the source notifies. The cache
// is also dropped on subscribe, so a change that happened while nobody was
// subscribed is picked up on the post-subscribe check.
const toConfigSource = (
  config: AuiConfig.Input | AssistantConfigSource,
): AssistantConfigSource => {
  if (!isConfigSource(config)) {
    return { getConfig: () => config, subscribe: NO_OP_SUBSCRIBE };
  }

  let cache: { value: AuiConfig.Input } | null = null;
  return {
    getConfig: () => (cache ??= { value: config.getConfig() }).value,
    subscribe: (listener) => {
      cache = null;
      return config.subscribe(() => {
        cache = null;
        listener();
      });
    },
  };
};

// A client (including the sentinel proxies, whose property reads all resolve)
// always carries `on`; a source or handle never does, so its absence is the
// discriminator
const isClientSource = (
  parent: AssistantClient | AssistantClientSource,
): parent is AssistantClientSource =>
  typeof (parent as AssistantClientSource).getClient === "function" &&
  !("on" in parent);

const toClientSource = (
  parent: AssistantClient | AssistantClientSource,
): AssistantClientSource =>
  isClientSource(parent)
    ? parent
    : {
        getClient: () => parent as AssistantClient,
        subscribe: (parent as AssistantClient).subscribe,
      };

/**
 * Creates an `AssistantClient` outside any UI framework.
 *
 * The client's scopes run as tap resources inside a standalone tap root; no
 * React renderer is involved. This is the construction seam for non-React
 * bindings: a framework bridge creates the handle, reads the current client
 * with `getClient`, re-reads it whenever `subscribe` fires (a structural
 * change produces a new client object, a value-only update keeps its
 * identity), and holds a subscription for as long as it needs the client
 * alive.
 *
 * The handle's lifecycle rides its subscriber count. Scopes render lazily on the first read and mount when the first subscriber attaches; state updates before that throw, so an imperative consumer without a reactive framework holds a no-op subscription. When the last subscriber releases, the root soft-unmounts on the next task: effects other than insertion effects clean up, state is retained, and a later subscriber remounts the same scopes. `destroy` is the permanent teardown: it aborts the destroy signal and synchronously releases every scope, insertion effects included, whether or not subscribers are attached. A bridge that only releases its subscriptions keeps insertion effects mounted until `destroy`.
 *
 * The parent may be a plain client or another source/handle. Passing a source
 * keeps the child bound to the parent's current client across the parent's
 * structural changes without remounting the child's scopes.
 *
 * The config may be a plain value, captured at creation, or an
 * {@link AssistantConfigSource} that is re-read in the root render whenever it
 * notifies, so a binding can deliver config changes (updated element args,
 * added or removed scopes) without remounting the surviving scopes.
 */
export const createAssistantClient = (
  config: AuiConfig.Input | AssistantConfigSource,
  options?: {
    parent?: AssistantClient | AssistantClientSource | undefined;
  },
): AssistantClientHandle => {
  const parentSource = toClientSource(
    options?.parent ?? DefaultAssistantClient,
  );
  const configSource = toConfigSource(config);

  const clientRef: ClientRef = {
    parent: parentSource.getClient(),
    current: null,
  };
  const destroyController = new AbortController();
  const notifications = createNotificationManager();
  let rebindRoot: (() => void) | null = null;
  let suppressNotifications = false;
  let derivedBindings: Array<
    [name: string, get: (client: AssistantClient) => unknown]
  > = [];

  const createRoot = () =>
    createTapRoot(
      function AssistantClientRoot() {
        const [, rebind] = useReducer((version: number) => version + 1, 0);
        rebindRoot = rebind;
        const parent = parentSource.getClient();
        clientRef.parent = parent;
        const currentConfig = useSyncExternalStore(
          configSource.subscribe,
          configSource.getConfig,
          configSource.getConfig,
        );
        const entries = Object.entries(
          applyTransformScopes(currentConfig, parent),
        ) as ScopeEntry[];
        derivedBindings = entries.flatMap(([name, element]) =>
          isDerivedElement(element)
            ? [
                [
                  name,
                  (
                    element.args[0] as {
                      get: (client: AssistantClient) => unknown;
                    }
                  ).get,
                ] as const,
              ]
            : [],
        );
        const result = useDestroySignalProvider(
          destroyController.signal,
          function useRootClient() {
            return useAuiRoot({ parent, entries, clientRef, notifications });
          },
        );
        // Seeded during render, before the commit runs mount effects that read it
        if (clientRef.current === null) {
          clientRef.current = result.client;
        }
        return result;
      },
      { mountOnSubscribe: true },
    );

  let root = createRoot();

  const notify = () => {
    clientRef.current = root.getValue().client;
    if (suppressNotifications) return;
    flushTapSync(notifications.notifySubscribers);
  };

  const needsRebind = (parent: AssistantClient, current: AssistantClient) => {
    if (clientRef.parent !== parent) return true;
    return derivedBindings.some(([name, get]) => {
      try {
        return (
          getClientId(get(current) as object) !==
          getClientId(
            (current as unknown as Record<string, object>)[name] as object,
          )
        );
      } catch {
        return true;
      }
    });
  };

  const rebindFromParent = () => {
    const parent = parentSource.getClient();
    const current = root.getValue().client;
    const rebind = needsRebind(parent, current);
    clientRef.parent = parent;
    if (rebind) {
      flushTapSync(() => rebindRoot?.());
    } else {
      notify();
    }
  };

  let subscriberCount = 0;
  let unwire: Unsubscribe | null = null;
  let destroyed = false;
  let hasMounted = false;

  const wire = () => {
    const unsubscribeParent = parentSource.subscribe(rebindFromParent);
    const latestParent = parentSource.getClient();
    const rebind = needsRebind(latestParent, root.getValue().client);
    clientRef.parent = latestParent;

    suppressNotifications = true;
    let unsubscribeRoot: Unsubscribe | null = null;
    try {
      // Commits the first mount; tap rolls the fiber back if it throws
      unsubscribeRoot = root.subscribe(notify);
      if (rebind) flushTapSync(() => rebindRoot?.());
      hasMounted = true;
    } catch (error) {
      suppressNotifications = false;
      unsubscribeRoot?.();
      unsubscribeParent();
      throw error;
    }
    suppressNotifications = false;
    notify();
    unwire = () => {
      unwire = null;
      unsubscribeParent();
      unsubscribeRoot?.();
    };
  };

  const release = () => {
    unwire?.();
    root.unmount();
  };

  return {
    getClient: () => {
      let current = root.getValue().client;
      if (subscriberCount > 0) return current;

      const parent = parentSource.getClient();
      if (!needsRebind(parent, current)) return current;
      clientRef.parent = parent;

      if (!hasMounted) {
        root.unmount();
        clientRef.current = null;
        rebindRoot = null;
        root = createRoot();
        current = root.getValue().client;
      } else {
        flushTapSync(() => rebindRoot?.());
        current = root.getValue().client;
      }
      clientRef.current = current;
      return current;
    },
    subscribe: (listener) => {
      if (destroyed) return () => {};
      const unsubscribe = notifications.subscribe(listener);
      if (subscriberCount++ === 0) {
        try {
          wire();
        } catch (error) {
          subscriberCount--;
          unsubscribe();
          throw error;
        }
        // A mount notification can destroy the handle before wire() assigns
        // unwire; complete that destroy now
        if (destroyed) release();
      }
      let isSubscribed = true;
      return () => {
        if (!isSubscribed) return;
        isSubscribed = false;
        unsubscribe();
        if (--subscriberCount === 0) unwire?.();
      };
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      destroyController.abort();
      // A destroy from a mount notification lands while wire() is still
      // mounting; subscribe completes it
      if (subscriberCount > 0 && unwire === null) return;
      release();
    },
  };
};
