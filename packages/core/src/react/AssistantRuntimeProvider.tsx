import { type ReactNode, memo } from "react";
import type { AssistantClient } from "@assistant-ui/store";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";
import { AssistantProviderBase } from "./AssistantProvider";

/**
 * Mounts an `AssistantRuntime` into the React tree.
 *
 * Accepts the runtime returned by a runtime hook (e.g. `useLocalRuntime`,
 * `useExternalStoreRuntime`, `useAssistantTransportRuntime`). Internally
 * installs an {@link AuiProvider}, so descendants can use `useAui`,
 * `useAuiState`, `useAuiEvent`, and the primitives without any
 * additional setup.
 *
 * @example
 * ```tsx
 * function App() {
 *   const runtime = useLocalRuntime({ adapter });
 *
 *   return (
 *     <AssistantRuntimeProvider runtime={runtime}>
 *       <Thread />
 *     </AssistantRuntimeProvider>
 *   );
 * }
 * ```
 */
export const AssistantRuntimeProvider = memo(
  ({
    runtime,
    aui,
    children,
  }: {
    /** The assistant runtime to expose to descendants. */
    runtime: AssistantRuntime;
    /**
     * Optional pre-built `AssistantClient`. When omitted, the provider
     * derives a client from `runtime`. Pass an explicit client only when
     * composing multiple runtimes or extending scopes upstream.
     * @defaultValue derived from `runtime`
     */
    aui?: AssistantClient | null;
    children: ReactNode;
  }) => {
    return (
      <AssistantProviderBase runtime={runtime} aui={aui ?? null}>
        {children}
      </AssistantProviderBase>
    );
  },
);
