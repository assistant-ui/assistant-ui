"use client";

import type React from "react";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import type { AssistantClient } from "./types/client";
import { AuiConfig } from "./AuiConfig";
import {
  AssistantContext,
  DefaultAssistantClient,
  getTapEffects,
  useAssistantContextValue,
} from "./utils/react-assistant-context";
import { useConfiguredAui } from "./useAui";

const isDevelopment =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test");

const EMPTY_CONFIG = AuiConfig({});

const MountTapEffects = ({ effects }: { effects: () => void }) => {
  "use no memo";
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effects);
  return null;
};

/**
 * Supplies an `AssistantClient` to the React tree.
 *
 * Place near the root of any subtree that uses {@link useAui} or the
 * primitives built on it. Components rendered outside an `AuiProvider`
 * receive a default client whose scope accessors throw on use, so
 * missing-provider mistakes surface at the point of use.
 *
 * `config` is required and must be built with {@link AuiConfig}. At the top
 * level, `config` alone creates this subtree's own client. Under a parent
 * provider, `extends` is mandatory: pass `extends={aui}` to extend the parent
 * client or `extends={null}` to isolate from it (enforced with a dev error).
 * Configs are identity-insensitive — a fresh object per render is safe.
 * A config whose scopes are all {@link Derived} keeps its scope set fixed
 * at mount (dev-enforced); configs with a root scope, and empty configs,
 * may grow and shrink scopes across renders. `ref` receives the resulting
 * client after mount.
 *
 * When mounting a runtime built with one of the runtime hooks, use
 * {@link AssistantRuntimeProvider} — it installs an `AuiProvider`
 * internally — rather than wiring `AuiProvider` yourself.
 *
 * @example
 * ```tsx
 * function MessageScope({ index, children }) {
 *   const aui = useAui();
 *   const config = AuiConfig({
 *     message: Derived({
 *       source: "thread",
 *       query: { index },
 *       get: (aui) => aui.thread.message({ index }),
 *     }),
 *   });
 *   return (
 *     <AuiProvider extends={aui} config={config}>
 *       {children}
 *     </AuiProvider>
 *   );
 * }
 * ```
 */
export const AuiProvider: {
  /**
   * Top-level root: creates this subtree's own client from `config`. Only
   * valid when no parent `AuiProvider` exists (dev-enforced); nested
   * providers must pass `extends`.
   */
  (props: {
    /** Scopes to create the client from; built with {@link AuiConfig}. */
    config: AuiConfig;
    /** Receives the resulting client after mount. */
    ref?: React.Ref<AssistantClient>;
    extends?: never;
    value?: never;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
  /**
   * Extends a parent client with the configured scopes, or isolates with
   * `extends={null}`.
   */
  (props: {
    /**
     * Parent to extend: pass `extends={aui}` to extend the surrounding
     * client (the empty default client behaves as a root) or `extends={null}`
     * for an isolated fresh root that ignores context.
     */
    extends: AssistantClient | null;
    /** Scopes to create the client from; built with {@link AuiConfig}. */
    config: AuiConfig;
    /** Receives the resulting client after mount. */
    ref?: React.Ref<AssistantClient>;
    value?: never;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
  (props: {
    /**
     * Assistant client to expose to descendants, or `null` for an isolated
     * empty root.
     *
     * @deprecated Pass an empty config built in the component body
     * (`const config = AuiConfig({})`) with `extends={client}` to expose a
     * client extending the given one, or with `extends={null}` for an
     * isolated empty root.
     */
    value: AssistantClient | null;
    extends?: never;
    config?: never;
    ref?: never;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
} = forwardRef<
  AssistantClient,
  {
    extends?: AssistantClient | null;
    value?: AssistantClient | null;
    config?: AuiConfig;
    children: React.ReactNode;
  }
>(function AuiProvider(props, ref) {
  // The <MountTapEffects /> element must be created fresh each render
  "use no memo";
  const { config, children } = props;
  const hasExtends = "extends" in props;
  const hasValue = "value" in props;
  const contextParent = useAssistantContextValue();

  if (isDevelopment) {
    if (hasExtends && hasValue) {
      throw new Error(
        "AuiProvider: pass either `extends` or `value`, not both.",
      );
    }
    if (hasExtends && props.extends === undefined) {
      throw new Error(
        "AuiProvider: `extends` must be a client or null, not undefined.",
      );
    }
    if (hasExtends && !config) {
      throw new Error("AuiProvider: `extends` requires a `config`.");
    }
    if (hasValue && config) {
      throw new Error(
        "AuiProvider: pass either `value` or `config`, not both.",
      );
    }
    if (!hasValue && !config) {
      throw new Error("AuiProvider: a `config` is required.");
    }
    if (!hasExtends && !hasValue && contextParent !== DefaultAssistantClient) {
      throw new Error(
        "A parent AuiProvider exists — pass extends={aui} to inherit it or extends={null} to isolate.",
      );
    }
  }

  const parent = hasExtends
    ? (props.extends ?? DefaultAssistantClient)
    : hasValue
      ? (props.value ?? DefaultAssistantClient)
      : contextParent;
  const { client, effects } = useConfiguredAui(parent, config ?? EMPTY_CONFIG);
  useImperativeHandle(ref, () => client, [client]);
  return (
    <AssistantContext.Provider value={client}>
      <MountTapEffects effects={getTapEffects(parent)} />
      {effects && <MountTapEffects effects={effects} />}
      {children}
    </AssistantContext.Provider>
  );
}) as never;
