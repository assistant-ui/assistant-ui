import { createContext, use } from "react";
import { useContextProvider } from "@assistant-ui/tap";

const DestroySignalContext = createContext<AbortSignal | undefined>(undefined);

/**
 * Scopes a subtree to the permanent teardown of whatever owns it. The signal
 * aborts when the owner is destroyed for good, never when a resource soft
 * unmounts and may come back, so a consumer may release work on it without
 * losing state a later reveal still needs.
 */
export const useDestroySignalProvider = <TResult>(
  destroySignal: AbortSignal | undefined,
  fn: () => TResult,
): TResult => useContextProvider(DestroySignalContext, destroySignal, fn);

/**
 * Returns the permanent teardown signal of the owner the caller runs under.
 * A caller outside any owned subtree resolves none, which retains its
 * resources rather than releasing them early.
 */
export const useAssistantClientDestroySignal = (): AbortSignal | undefined =>
  use(DestroySignalContext);
