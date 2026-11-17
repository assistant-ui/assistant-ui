import {
  createComponent,
  createEffect,
  createRoot,
  getOwner,
  on,
  onCleanup,
  type JSX,
} from "solid-js";
import {
  createAssistantClient,
  createClientFacade,
  type AssistantClient,
  type AuiConfig,
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
    {
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
  // The provider holds the lifetime subscription that keeps the client
  // mounted while descendants come and go
  onCleanup(handle.subscribe(() => {}));

  return createComponent(AuiContext.Provider, {
    value: { source: handle, aui: createClientFacade(handle) },
    get children() {
      return props.children;
    },
  });
};
