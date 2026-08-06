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
 * The config is captured at creation; create a new handle to change the scope
 * set.
 */
export const createAssistantClient = (
  config: AuiConfig.Input,
  options?: {
    parent?: AssistantClient | AssistantClientSource | undefined;
  },
): AssistantClientHandle => {
  const parentSource = toClientSource(
    options?.parent ?? DefaultAssistantClient,
  );

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
    const entries = Object.entries(
      applyTransformScopes(config, parent),
    ) as ScopeEntry[];
    return useAuiRoot({ parent, entries, clientRef, notifications });
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
