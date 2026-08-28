"use client";

import { createContext, useContext, type Context, type ReactNode } from "react";
import type { ClientMethods, ClientNames } from "../types/client";

export const SCOPE_STATE_UNSET = Symbol("assistant-ui.store.scopeStateUnset");

export type ScopeEntry = { state: unknown; output: ClientMethods | undefined };
export type ScopeStates = Partial<Record<ClientNames, ScopeEntry>>;
type ScopeContextValue = ScopeEntry | typeof SCOPE_STATE_UNSET;

const contexts = new Map<ClientNames, Context<ScopeContextValue>>();

const getScopeStateContext = (
  name: ClientNames,
): Context<ScopeContextValue> => {
  let ctx = contexts.get(name);
  if (!ctx) {
    ctx = createContext<ScopeContextValue>(SCOPE_STATE_UNSET);
    ctx.displayName = `AuiScopeState(${name})`;
    contexts.set(name, ctx);
  }
  return ctx;
};

export const useScopeStateContext = (name: ClientNames): ScopeContextValue =>
  useContext(getScopeStateContext(name));

const ScopeLevel = ({
  name,
  states,
  children,
}: {
  name: ClientNames;
  states: ScopeStates;
  children: ReactNode;
}) => {
  const Ctx = getScopeStateContext(name);
  const inherited = useContext(Ctx);
  const value = name in states ? states[name]! : inherited;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
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
