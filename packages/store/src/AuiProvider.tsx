"use client";

import type React from "react";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import type { AssistantClient } from "./types/client";
import type { AuiConfig } from "./AuiConfig";
import {
  AssistantContext,
  DefaultAssistantClient,
  UseTapEffects,
  useAssistantContextValue,
} from "./utils/react-assistant-context";
import { useScopedClient } from "./useAui";

const isDevelopment =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test");

const MountTapEffects = ({ effects }: { effects: () => void }) => {
  "use no memo";
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effects);
  return null;
};

const ConfiguredAui = forwardRef<
  AssistantClient,
  { config: AuiConfig; children: React.ReactNode }
>(function ConfiguredAui({ config, children }, ref) {
  // The <MountTapEffects /> element must be created fresh each render
  "use no memo";
  const parent = useAssistantContextValue();
  const { client, effects } = useScopedClient(parent, config);
  useImperativeHandle(ref, () => client, [client]);
  return (
    <AssistantContext.Provider value={client}>
      {effects && <MountTapEffects effects={effects} />}
      {children}
    </AssistantContext.Provider>
  );
});

const PassthroughAui = forwardRef<
  AssistantClient,
  { client: AssistantClient; children: React.ReactNode }
>(function PassthroughAui({ client, children }, ref) {
  // The <UseTapEffects /> element must be created fresh each render
  "use no memo";
  useImperativeHandle(ref, () => client, [client]);
  return (
    <AssistantContext.Provider value={client}>
      <UseTapEffects />
      {children}
    </AssistantContext.Provider>
  );
});

const isEmptyConfig = (config: AuiConfig) => Object.keys(config).length === 0;

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
 * provider, `aui` is mandatory: pass `aui={useAui()}` to extend the parent
 * client or `aui={null}` to isolate from it (enforced with a dev error). An
 * empty config passes the `aui` client through as-is. Configs are
 * identity-insensitive — a fresh object per render is safe. `ref` receives
 * the resulting client after mount.
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
 *     <AuiProvider aui={aui} config={config}>
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
   * providers must pass `aui`.
   */
  (props: {
    /** Scopes to create the client from; built with {@link AuiConfig}. */
    config: AuiConfig;
    /** Receives the resulting client after mount. */
    ref?: React.Ref<AssistantClient>;
    aui?: never;
    value?: never;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
  /**
   * Extends a parent client with the configured scopes, or isolates with
   * `aui={null}`. An empty config provides the `aui` client as-is.
   */
  (props: {
    /**
     * Parent to extend: pass `aui={useAui()}` to extend the surrounding
     * client (the empty default client behaves as a root) or `aui={null}`
     * for an isolated fresh root that ignores context.
     */
    aui: AssistantClient | null;
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
     * (`const config = AuiConfig({})`) with `aui={client}` to provide an
     * existing client, or with `aui={null}` for an isolated empty root.
     */
    value: AssistantClient | null;
    aui?: never;
    config?: never;
    ref?: never;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
} = forwardRef<
  AssistantClient,
  {
    aui?: AssistantClient | null;
    value?: AssistantClient | null;
    config?: AuiConfig;
    children: React.ReactNode;
  }
>(function AuiProvider(props, ref) {
  // The <UseTapEffects /> element must be created fresh each render
  "use no memo";
  const { config, children } = props;
  const hasAui = "aui" in props;
  const hasValue = "value" in props;
  const contextParent = useAssistantContextValue();

  if (isDevelopment) {
    if (hasAui && hasValue) {
      throw new Error("AuiProvider: pass either `aui` or `value`, not both.");
    }
    if (hasAui && !config) {
      throw new Error("AuiProvider: `aui` requires a `config`.");
    }
    if (!hasAui && !hasValue && contextParent !== DefaultAssistantClient) {
      throw new Error(
        "A parent AuiProvider exists — pass aui={useAui()} to inherit it or aui={null} to isolate.",
      );
    }
  }

  if (hasAui) {
    const auiClient = props.aui;
    if (auiClient && isEmptyConfig(config!)) {
      return (
        <PassthroughAui client={auiClient} ref={ref}>
          {children}
        </PassthroughAui>
      );
    }
    return (
      <AssistantContext.Provider value={auiClient ?? DefaultAssistantClient}>
        <UseTapEffects />
        <ConfiguredAui config={config!} ref={ref}>
          {children}
        </ConfiguredAui>
      </AssistantContext.Provider>
    );
  }

  const inner = config ? (
    <ConfiguredAui config={config} ref={ref}>
      {children}
    </ConfiguredAui>
  ) : (
    children
  );
  if (!hasValue) return inner;
  return (
    <AssistantContext.Provider value={props.value ?? DefaultAssistantClient}>
      <UseTapEffects />
      {inner}
    </AssistantContext.Provider>
  );
}) as never;
