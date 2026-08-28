import { useMemo, useSyncExternalStore } from "react";
import type { AssistantClient, ClientNames } from "../types/client";
import { getClientOutput } from "../useClientResource";
import { isScopeAvailable } from "./client-accessor";
import { clientScopeKeys } from "./client-keys";
import type { ScopeStates } from "./scope-state-context";

const readScopeStates = (client: AssistantClient): ScopeStates => {
  const states: ScopeStates = {};
  for (const name of clientScopeKeys(client) as ClientNames[]) {
    const accessor = client[name];
    if (!isScopeAvailable(accessor)) continue;
    const output = getClientOutput(accessor());
    states[name] = { state: output?.getState?.(), output };
  }
  return states;
};

/**
 * Scope entries for a client that was not built by this provider (the
 * deprecated `value` prop): read on every store notification.
 */
export const useLegacyScopeStates = (
  client: AssistantClient,
): { names: ClientNames[]; states: ScopeStates } => {
  const cache = useMemo(() => {
    let version = 0;
    let states = readScopeStates(client);
    let read = version;
    return {
      subscribe: (listener: () => void) =>
        client.subscribe(() => {
          version++;
          listener();
        }),
      get: () => {
        if (read !== version) {
          read = version;
          states = readScopeStates(client);
        }
        return states;
      },
    };
  }, [client]);
  const states = useSyncExternalStore(cache.subscribe, cache.get, cache.get);
  return { names: Object.keys(states) as ClientNames[], states };
};
