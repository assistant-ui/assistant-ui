"use client";

import { createTapRoot, flushTapSync } from "@assistant-ui/tap";
import { useSyncExternalStore } from "react";

import type { AssistantClient, Unsubscribe } from "./types/client";
import type { AuiConfig } from "./AuiConfig";
import { DefaultAssistantClient } from "./utils/react-assistant-context";
import { createNotificationManager } from "./utils/NotificationManager";
import {
  applyTransformScopes,
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

const toConfigSource = (
  config: AuiConfig.Input | AssistantConfigSource,
): AssistantConfigSource =>
  isConfigSource(config)
    ? config
    : { getConfig: () => config, subscribe: NO_OP_SUBSCRIBE };

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
 * identity), and calls `destroy` on teardown.
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
  const notifications = createNotificationManager();

  const root = createTapRoot(function AssistantClientRoot() {
    const parent = useSyncExternalStore(
      parentSource.subscribe,
      parentSource.getClient,
      parentSource.getClient,
    );
    const currentConfig = useSyncExternalStore(
      configSource.subscribe,
      configSource.getConfig,
      configSource.getConfig,
    );
    const entries = Object.entries(
      applyTransformScopes(currentConfig, parent),
    ) as ScopeEntry[];
    const result = useAuiRoot({ parent, entries, clientRef, notifications });
    // Seeded during render, before the commit runs mount effects that read it
    if (clientRef.current === null) {
      clientRef.current = result.client;
    }
    return result;
  });
  clientRef.current = root.getValue().client;

  // flushTapSync makes structural rebinds triggered by a notification land
  // before the notification returns
  const notify = () => {
    clientRef.parent = parentSource.getClient();
    clientRef.current = root.getValue().client;
    flushTapSync(notifications.notifySubscribers);
  };
  const unsubscribeRoot = root.subscribe(notify);
  const unsubscribeParent = parentSource.subscribe(notify);

  return {
    getClient: () => root.getValue().client,
    subscribe: notifications.subscribe,
    destroy: () => {
      unsubscribeRoot();
      unsubscribeParent();
      root.unmount();
    },
  };
};
