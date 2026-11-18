import {
  createComponent,
  createEffect,
  createRoot,
  createSignal,
  getOwner,
  on,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
import { isServer } from "solid-js/web";
import {
  createAssistantClient,
  createClientFacade,
  type AssistantClient,
  type AuiConfig,
  type Unsubscribe,
} from "@assistant-ui/store/client";
import { isDevelopment } from "@assistant-ui/core/store/internal";
import { AuiContext, defaultContext, useAuiContext } from "./context";

export type AuiProviderProps = {
  config: AuiConfig;
  extends?: AssistantClient | null | undefined;
  children?: JSX.Element;
};

/**
 * Creates an `AssistantClient` from the given config and provides it to the
 * subtree.
 *
 * At the top level, `config` alone creates this subtree's own client. Under a
 * parent provider, `extends` is mandatory: pass `extends={aui}` to extend the
 * parent client or `extends={null}` to isolate from it (enforced with a dev
 * error).
 *
 * The `config` prop is live: passing a new config object updates element args
 * in place (scopes keep their state) and mounts or unmounts added and removed
 * scopes. `extends` is captured when the provider mounts; remount the
 * provider to change the parent.
 *
 * On the server, the initial config is captured without subscribing or mounting client effects. The client is destroyed when Solid disposes the render root. On the client, effects mount in Solid's `onMount` so the initial render matches the server state.
 */
export const AuiProvider = (props: AuiProviderProps): JSX.Element => {
  const injected = useAuiContext();
  const hasParent = injected !== defaultContext;
  const ext = props.extends;
  const hasExtends = ext !== undefined;

  if (isDevelopment) {
    if (hasParent && !hasExtends) {
      throw new Error(
        "A parent AuiProvider exists. Pass extends={aui} to inherit it or extends={null} to isolate.",
      );
    }
  }

  const parent = !hasExtends
    ? hasParent
      ? injected.source
      : undefined
    : ext === null
      ? undefined
      : hasParent && ext === injected.aui
        ? injected.source
        : ext;

  const owner = getOwner();
  const handle = createAssistantClient(
    isServer
      ? props.config
      : {
          getConfig: () => props.config,
          // The store subscribes outside any Solid owner, so each subscription
          // runs in its own root that the store disposes through the returned
          // unsubscribe
          subscribe: (listener) =>
            createRoot((dispose) => {
              createEffect(on(() => props.config, listener, { defer: true }));
              return dispose;
            }, owner),
        },
    parent ? { parent } : undefined,
  );
  // One subscription writes one signal per store update, so every accessor in
  // the subtree recomputes before any dependent effect runs
  const [track, trigger] = createSignal(undefined, { equals: false });
  let release: Unsubscribe | undefined;
  onMount(() => {
    // Parent mount effects can change its snapshot after this handle first renders.
    handle.getClient();
    release = handle.subscribe(() => trigger());
    trigger();
  });
  onCleanup(() => {
    release?.();
    // A throwing cleanup would stop Solid from disposing the rest of the tree
    try {
      handle.destroy();
    } catch (error) {
      console.error("[assistant-ui] AuiProvider cleanup threw an error", error);
    }
  });

  return createComponent(AuiContext.Provider, {
    value: {
      source: handle,
      aui: createClientFacade(handle),
      track: isServer ? () => {} : track,
    },
    get children() {
      return props.children;
    },
  });
};
