import type { Action } from "./ir";

/**
 * Context handed to an {@link ActionHandler} when an `$action` fires. Reserved
 * for the dispatch path's runtime needs (e.g. the tool-call id, an abort
 * signal); the handler reads what it needs and ignores the rest.
 */
export type ActionDispatchContext = {
  /** The action payload (`$action`), as the model emitted it. */
  readonly payload: Action;
};

/**
 * Resolves a single `$action.type`. Fire-and-forget actions return `void` or a
 * promise that resolves to it; human-in-the-loop actions return a value the
 * runtime uses to resume the run (see IR doc Open question #2 — the resume
 * value is left as `unknown` and documented per-action). The return value is
 * handed back to `dispatch`'s caller as `unknown`.
 */
export type ActionHandler = (
  ctx: ActionDispatchContext,
) => unknown | Promise<unknown>;

/**
 * The host-provided map from `$action.type` to {@link ActionHandler}. This is
 * the single dispatch target for `$action` on web, shared by the model
 * `present` renderer, the synthetic `present` produced from A2A/A2UI, and the
 * decoded `block_actions` from Slack. Construct it with
 * {@link createActionRegistry} and pass it to `JSONGenerativeUI`.
 */
export type ActionRegistry = {
  /** Resolves `$action.type` to its handler and calls it, returning its result. */
  dispatch(action: Action): unknown;
  /** Whether a handler is registered for `type`. */
  has(type: string): boolean;
};

export function createActionRegistry(
  handlers: Readonly<Record<string, ActionHandler>>,
): ActionRegistry {
  const map = new Map(Object.entries(handlers));
  return {
    dispatch(action) {
      const handler = map.get(action.type);
      if (!handler) {
        if (process.env["NODE_ENV"] !== "production") {
          // eslint-disable-next-line no-console
          console.warn(
            `[@assistant-ui/react-generative-ui] No handler registered for ` +
              `action type "${action.type}". Available: ` +
              `${[...map.keys()].join(", ") || "(none)"}.`,
          );
        }
        return undefined;
      }
      return handler({ payload: action });
    },
    has(type) {
      return map.has(type);
    },
  };
}

/** A no-op registry used when no handlers are provided. Dispatch resolves to
 * `undefined` and logs a warning in dev for unknown types, so a model-emitted
 * action with no handler degrades to "does nothing" rather than throwing. */
export const emptyActionRegistry: ActionRegistry = createActionRegistry({});
