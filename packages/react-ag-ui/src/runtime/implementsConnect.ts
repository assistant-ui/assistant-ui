import type { AbstractAgent } from "@ag-ui/client";

// connectAgent() swallows the base class's not-implemented error and resolves
// with no events, so only an agent that overrides connect() can rejoin a run.
// AbstractAgent extends nothing, so the prototype owning connect() is the base
// exactly when its own prototype is Object.prototype. Checking ownership instead
// of function identity holds when the app loads its own copy of @ag-ui/client.
/** Whether the agent overrides AG-UI's `connect()`, so its runs can be rejoined and keep going on the server. */
export const implementsConnect = (agent: AbstractAgent): boolean => {
  if (typeof agent.connectAgent !== "function") return false;
  for (
    let proto: object | null = Object.getPrototypeOf(agent);
    proto !== null;
    proto = Object.getPrototypeOf(proto)
  ) {
    if (Object.prototype.hasOwnProperty.call(proto, "connect")) {
      return Object.getPrototypeOf(proto) !== Object.prototype;
    }
  }
  return false;
};
