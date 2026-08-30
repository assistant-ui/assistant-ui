"use client";

import { createContext, useContext, type Context, type ReactNode } from "react";
import type { ClientMethods, ClientNames } from "../types/client";

export const SCOPE_STATE_UNSET = Symbol("assistant-ui.store.scopeStateUnset");

export type ScopeEntry = { state: unknown; output: ClientMethods | undefined };
export type ScopeStates = Partial<Record<ClientNames, ScopeEntry>>;
type ScopeContextValue = ScopeEntry | typeof SCOPE_STATE_UNSET;
type StateContextValue = unknown | typeof SCOPE_STATE_UNSET;
type OutputContextValue = ClientMethods | undefined;

// State and render output travel in separate contexts: a client re-render
// with unchanged state republishes only its output, so useAuiState(scope)
// readers bail out while derived scopes still resolve against the latest
// render output.
const stateContexts = new Map<ClientNames, Context<StateContextValue>>();
const outputContexts = new Map<ClientNames, Context<OutputContextValue>>();

const getStateContext = (name: ClientNames): Context<StateContextValue> => {
  let ctx = stateContexts.get(name);
  if (!ctx) {
    ctx = createContext<StateContextValue>(SCOPE_STATE_UNSET);
    ctx.displayName = `AuiScopeState(${name})`;
    stateContexts.set(name, ctx);
  }
  return ctx;
};

const getOutputContext = (name: ClientNames): Context<OutputContextValue> => {
  let ctx = outputContexts.get(name);
  if (!ctx) {
    ctx = createContext<OutputContextValue>(undefined);
    ctx.displayName = `AuiScopeOutput(${name})`;
    outputContexts.set(name, ctx);
  }
  return ctx;
};

export const useScopeState = (name: ClientNames): StateContextValue =>
  useContext(getStateContext(name));

export const useScopeStateContext = (name: ClientNames): ScopeContextValue => {
  const state = useContext(getStateContext(name));
  const output = useContext(getOutputContext(name));
  if (state === SCOPE_STATE_UNSET) return SCOPE_STATE_UNSET;
  return { state, output };
};

const ScopeLevel = ({
  name,
  states,
  children,
}: {
  name: ClientNames;
  states: ScopeStates;
  children: ReactNode;
}) => {
  const StateCtx = getStateContext(name);
  const OutputCtx = getOutputContext(name);
  const inheritedState = useContext(StateCtx);
  const inheritedOutput = useContext(OutputCtx);
  const entry = name in states ? states[name]! : undefined;
  const state = entry ? entry.state : inheritedState;
  const output = entry ? entry.output : inheritedOutput;
  return (
    <StateCtx.Provider value={state}>
      <OutputCtx.Provider value={output}>{children}</OutputCtx.Provider>
    </StateCtx.Provider>
  );
};

// `names` is fixed per provider so the tree depth below it never changes.
export const ScopeStateProviders = ({
  names,
  states,
  children,
}: {
  names: readonly ClientNames[];
  states: ScopeStates;
  children: ReactNode;
}) => {
  let node = children;
  for (let i = names.length - 1; i >= 0; i--) {
    node = (
      <ScopeLevel name={names[i]!} states={states}>
        {node}
      </ScopeLevel>
    );
  }
  return node;
};
