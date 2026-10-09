import type { Catalog } from "./catalog";
import { resolveValue, type ExpressionContext } from "./expressions";
import type { SpecStateStore } from "./state";
import type { ActionBinding } from "./types";

/** Where an action was dispatched from. */
export type ActionSource = {
  elementId?: string;
  /** The event name, or the watched path for `watch`. */
  trigger?: string;
};

export type ActionHandler = (
  params: Record<string, unknown>,
  context: ActionSource & { state: SpecStateStore },
) => unknown;

export type ActionDispatcherOptions = {
  store: SpecStateStore;
  catalog?: Catalog;
  /** Handlers by action name; they take precedence over `onAction`. */
  handlers?: Record<string, ActionHandler>;
  /** Called for catalog actions without a handler. */
  onAction?: (
    name: string,
    params: Record<string, unknown>,
    context: ActionSource & { state: SpecStateStore },
  ) => unknown;
  /** Reports actions that fail or are unknown instead of throwing. */
  onError?: (error: Error, binding: ActionBinding) => void;
};

export type ActionDispatcher = (
  bindings: ActionBinding | readonly ActionBinding[] | undefined,
  context: Omit<ExpressionContext, "state" | "event"> &
    ActionSource & {
      /** The payload the event carried, read by `{ $event }`. */
      payload?: unknown;
    },
) => Promise<unknown[]>;

/**
 * Creates the function elements use to run their bound actions: params are
 * resolved against current state (and the event payload), `setState` writes
 * the store, and every other action goes to a host handler. Actions in a list
 * run in order and see state written by the ones before them.
 */
export function createActionDispatcher(
  options: ActionDispatcherOptions,
): ActionDispatcher {
  const report = (error: unknown, binding: ActionBinding) => {
    const normalized =
      error instanceof Error ? error : new Error(String(error));
    if (options.onError) options.onError(normalized, binding);
    else
      console.warn(
        `[generative-frame] action "${binding.action}" failed:`,
        normalized,
      );
  };

  return async (bindings, context) => {
    const list =
      bindings === undefined
        ? []
        : Array.isArray(bindings)
          ? bindings
          : [bindings];
    const results: unknown[] = [];
    for (const binding of list as ActionBinding[]) {
      const { payload, elementId, trigger, ...scope } = context;
      const params = (resolveValue(binding.params ?? {}, {
        ...scope,
        state: options.store.getState(),
        event: payload,
      }) ?? {}) as Record<string, unknown>;
      const source = {
        ...(elementId !== undefined ? { elementId } : {}),
        ...(trigger !== undefined ? { trigger } : {}),
        state: options.store,
      };
      try {
        const handler = options.handlers?.[binding.action];
        if (handler) {
          results.push(await handler(params, source));
        } else if (binding.action === "setState") {
          if (typeof params["path"] !== "string") {
            throw new Error("setState needs a string `path`");
          }
          options.store.set(params["path"], params["value"]);
          results.push(undefined);
        } else if (options.catalog && !options.catalog.action(binding.action)) {
          throw new Error(`Unknown action "${binding.action}"`);
        } else if (options.onAction) {
          results.push(await options.onAction(binding.action, params, source));
        } else {
          throw new Error(`No handler for action "${binding.action}"`);
        }
      } catch (error) {
        report(error, binding);
        results.push(undefined);
      }
    }
    return results;
  };
}
