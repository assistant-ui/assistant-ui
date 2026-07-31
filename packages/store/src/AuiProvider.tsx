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

const PortalAui = forwardRef<
  AssistantClient,
  { client: AssistantClient; children: React.ReactNode }
>(function PortalAui({ client, children }, ref) {
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

/**
 * Supplies an `AssistantClient` to the React tree.
 *
 * Place near the root of any subtree that uses {@link useAui} or the
 * primitives built on it. Components rendered outside an `AuiProvider`
 * receive a default client whose scope accessors throw on use, so
 * missing-provider mistakes surface at the point of use.
 *
 * At the top level, `config` alone creates this subtree's own client. Under
 * a parent provider, `extend` is mandatory: pass `extend={useAui()}` to
 * extend the parent client or `extend={null}` to isolate from it (enforced
 * with a dev error). `extend` without a `config` provides the given client
 * as-is. Configs are identity-insensitive — a fresh object per render is
 * safe. `ref` receives the resulting client after mount.
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
 *     <AuiProvider extend={aui} config={config}>
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
   * providers must pass `extend`.
   */
  (props: {
    /** Scopes to create the client from; built with {@link AuiConfig}. */
    config: AuiConfig;
    /** Receives the resulting client after mount. */
    ref?: React.Ref<AssistantClient>;
    extend?: never;
    value?: never;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
  /**
   * Extends the given client with the configured scopes, or isolates with
   * `extend={null}`. Without a `config`, provides the `extend` client as-is.
   */
  (props: {
    /**
     * Parent to extend: pass `extend={useAui()}` to extend the surrounding
     * client (the empty default client behaves as a root) or `extend={null}`
     * for an isolated fresh root that ignores context.
     */
    extend: AssistantClient | null;
    /** Scopes to create the client from; omit to provide `extend` as-is. */
    config?: AuiConfig;
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
     * @deprecated Use `extend={aui}` to provide an existing client, or
     * `extend={null} config={AuiConfig({})}` for an isolated empty root.
     */
    value: AssistantClient | null;
    /** Scopes to create a client from; extends the `value` client. */
    config?: AuiConfig;
    extend?: never;
    ref?: never;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
} = forwardRef<
  AssistantClient,
  {
    extend?: AssistantClient | null;
    value?: AssistantClient | null;
    config?: AuiConfig;
    children: React.ReactNode;
  }
>(function AuiProvider(props, ref) {
  // The <UseTapEffects /> element must be created fresh each render
  "use no memo";
  const { config, children } = props;
  const hasExtend = "extend" in props;
  const hasValue = "value" in props;
  const contextParent = useAssistantContextValue();

  if (isDevelopment) {
    if (hasExtend && hasValue) {
      throw new Error(
        "AuiProvider: pass either `extend` or `value`, not both.",
      );
    }
    if (!hasExtend && !hasValue && contextParent !== DefaultAssistantClient) {
      throw new Error(
        "A parent AuiProvider exists — pass extend={useAui()} to inherit it or extend={null} to isolate.",
      );
    }
  }

  if (hasExtend) {
    const parent = props.extend ?? DefaultAssistantClient;
    if (!config) {
      return (
        <PortalAui client={parent} ref={ref}>
          {children}
        </PortalAui>
      );
    }
    return (
      <AssistantContext.Provider value={parent}>
        <UseTapEffects />
        <ConfiguredAui config={config} ref={ref}>
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
