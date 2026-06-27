import type { Action } from "./ir";

/** Context handed to an {@link ActionHandler} when an `$action` fires. */
export type ActionDispatchContext = {
  /**
   * The action payload. For fire-and-forget actions this is the `$action` as
   * the model emitted it. For interactive components (`Select`/`Input`/
   * `DatePicker`) the user's runtime input is merged in under the reserved
   * `$input` key, so the handler sees both the model payload and what the user
   * did; a model-supplied `value` field is never clobbered.
   */
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
  dispatch(action: Action): unknown;
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
          const actionTypes = [...map.keys()];
          // eslint-disable-next-line no-console
          console.warn(
            `[@assistant-ui/react-generative-ui] Action "${action.type}" has ` +
              `no registered handler. ${formatRegisteredActions(actionTypes)} ` +
              "Register it with createActionRegistry(...) or update the emitted " +
              "`$action.type`.",
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

function formatRegisteredActions(actionTypes: string[]) {
  if (actionTypes.length === 0) return "No actions are registered.";

  return `Registered actions: ${actionTypes
    .map((type) => `"${type}"`)
    .join(", ")}.`;
}
