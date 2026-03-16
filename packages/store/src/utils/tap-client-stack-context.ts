import {
  createResourceContext,
  tap,
  withContextProvider,
  tapMemo,
} from "@assistant-ui/tap";
import type { ClientMethods } from "../types/client";

/**
 * Symbol used to get the client index from a ClientProxy.
 */
export const SYMBOL_CLIENT_INDEX = Symbol("assistant-ui.store.clientIndex");

/**
 * Get the index of a client (its position in the client stack when created).
 */
export const getClientIndex = (client: ClientMethods): number => {
  return (client as unknown as { [SYMBOL_CLIENT_INDEX]: number })[
    SYMBOL_CLIENT_INDEX
  ];
};

/**
 * The client stack - an array of clients representing the current hierarchy.
 */
export type ClientStack = readonly ClientMethods[];

const ClientStackContext = createResourceContext<ClientStack>([]);

/**
 * Get the current client stack inside a tap resource.
 */
export const tapClientStack = (): ClientStack => {
  return tap(ClientStackContext);
};

/**
 * Execute a callback with a client pushed onto the stack.
 * The stack is duplicated, not mutated.
 */
export const tapWithClientStack = <T>(
  client: ClientMethods,
  callback: () => T,
): T => {
  const currentStack = tapClientStack();
  const newStack = tapMemo(
    () => [...currentStack, client],
    [currentStack, client],
  );
  return withContextProvider(ClientStackContext, newStack, callback);
};
