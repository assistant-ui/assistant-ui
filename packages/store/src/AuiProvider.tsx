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

/**
 * Supplies an `AssistantClient` to the React tree.
 *
 * Place near the root of any subtree that uses {@link useAui} or the
 * primitives built on it. Components rendered outside an `AuiProvider`
 * receive a default client whose scope accessors throw on use, so
 * missing-provider mistakes surface at the point of use.
 *
 * Pass `config` to create the client in place: the provider extends the
 * parent client (the inherited one, an empty root with `value={null}`, or an
 * explicit `value`) with the configured scopes and provides the result.
 * Configs are identity-insensitive — a fresh object per render is safe.
 * `ref` receives the created client after mount.
 *
 * When mounting a runtime built with one of the runtime hooks, use
 * {@link AssistantRuntimeProvider} — it installs an `AuiProvider`
 * internally — rather than wiring `AuiProvider` yourself.
 *
 * @example
 * ```tsx
 * function MessageScope({ index, children }) {
 *   return (
 *     <AuiProvider
 *       config={AuiConfig({
 *         message: Derived({
 *           source: "thread",
 *           query: { index },
 *           get: (aui) => aui.thread.message({ index }),
 *         }),
 *       })}
 *     >
 *       {children}
 *     </AuiProvider>
 *   );
 * }
 * ```
 */
export const AuiProvider: {
  (props: {
    /** Assistant client to expose to descendants. */
    value: AssistantClient;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
  /**
   * Provides an isolated empty root: scopes from surrounding providers do not
   * leak past the boundary.
   *
   * @deprecated This API is still under active development and might change without notice.
   */
  (props: { value: null; children: React.ReactNode }): React.ReactElement;
  (props: {
    /** Scopes to create a client from; extends the parent client. */
    config: AuiConfig;
    /**
     * Parent to extend: omit to inherit from context, `null` for an isolated
     * empty root, or an existing client to extend it across React roots.
     */
    value?: AssistantClient | null;
    /** Receives the created client after mount. */
    ref?: React.Ref<AssistantClient>;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
} = forwardRef<
  AssistantClient,
  {
    value?: AssistantClient | null;
    config?: AuiConfig;
    children: React.ReactNode;
  }
>(function AuiProvider({ value, config, children }, ref) {
  // The <UseTapEffects /> element must be created fresh each render
  "use no memo";
  const inner = config ? (
    <ConfiguredAui config={config} ref={ref}>
      {children}
    </ConfiguredAui>
  ) : (
    children
  );
  if (value === undefined) return inner;
  return (
    <AssistantContext.Provider value={value ?? DefaultAssistantClient}>
      <UseTapEffects />
      {inner}
    </AssistantContext.Provider>
  );
}) as never;
