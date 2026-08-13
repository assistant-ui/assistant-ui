import { getContext, onDestroy, setContext } from "svelte";
import { toStore } from "svelte/store";
import {
  createAssistantClient,
  type AssistantClient,
  type AssistantConfigSource,
  type AuiConfig,
} from "@assistant-ui/store/client";
import { auiContextKey, createClientFacade, type AuiContext } from "./context";
import { isDevelopment } from "./isDevelopment";

const thunkToSource = (getConfig: () => AuiConfig): AssistantConfigSource => {
  const store = toStore(getConfig);
  return {
    getConfig,
    subscribe: (listener) => {
      // Svelte stores call the subscriber immediately; the config source
      // contract notifies on changes only
      let initial = true;
      return store.subscribe(() => {
        if (initial) {
          initial = false;
          return;
        }
        listener();
      });
    },
  };
};

/**
 * Creates an `AssistantClient` from the given config and provides it to the
 * component subtree. Call during component initialization.
 *
 * At the top level, `config` alone creates this subtree's own client. Under a
 * parent provider, `extends` is mandatory: pass `{ extends: aui }` to extend
 * the parent client or `{ extends: null }` to isolate from it (enforced with
 * a dev error).
 *
 * Pass the config as a thunk (`provideAui(() => config)`) to make it live:
 * reactive reads inside the thunk re-deliver the config, updating element
 * args in place (scopes keep their state) and mounting or unmounting added
 * and removed scopes. A plain config object is captured once. `extends` is
 * captured when the provider mounts.
 *
 * The provider holds the client's lifetime subscription: the client mounts
 * immediately and soft-unmounts after the component is destroyed and every
 * descendant subscription has released.
 */
export const provideAui = (
  config: AuiConfig | (() => AuiConfig),
  options?: { extends?: AssistantClient | null | undefined },
): AssistantClient => {
  const injected = getContext<AuiContext | undefined>(auiContextKey) ?? null;
  const ext = options?.extends;
  const hasExtends = ext !== undefined;

  if (isDevelopment) {
    if (injected && !hasExtends) {
      throw new Error(
        "A parent provideAui exists. Pass { extends: aui } to inherit it or { extends: null } to isolate.",
      );
    }
  }

  const parent = !hasExtends
    ? injected?.source
    : ext === null
      ? undefined
      : injected && ext === injected.aui
        ? injected.source
        : ext;

  const handle = createAssistantClient(
    typeof config === "function" ? thunkToSource(config) : config,
    parent ? { parent } : undefined,
  );
  // The provider holds the lifetime subscription that keeps the client
  // mounted while descendants come and go
  const release = handle.subscribe(() => {});
  onDestroy(release);

  const source = {
    getClient: handle.getClient,
    subscribe: handle.subscribe,
  };
  const aui = createClientFacade(source);
  setContext(auiContextKey, { source, aui } satisfies AuiContext);
  return aui;
};
