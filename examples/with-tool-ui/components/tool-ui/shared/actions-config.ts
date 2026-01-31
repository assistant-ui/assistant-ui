import type { Action, ActionsConfig } from "./schema";

export type ActionsProp = ActionsConfig | Action[];

const NEGATORY_ACTION_IDS = new Set([
  "cancel",
  "dismiss",
  "skip",
  "no",
  "reset",
  "close",
  "decline",
  "reject",
  "back",
  "later",
  "not-now",
  "maybe-later",
]);

function inferVariant(action: Action): Action {
  if (action.variant) return action;
  if (NEGATORY_ACTION_IDS.has(action.id)) {
    return { ...action, variant: "ghost" };
  }
  return action;
}

export function normalizeActionsConfig(
  actions?: ActionsProp,
): ActionsConfig | null {
  if (!actions) return null;

  const rawItems = Array.isArray(actions) ? actions : (actions.items ?? []);

  if (rawItems.length === 0) {
    return null;
  }

  const items = rawItems.map(inferVariant);

  return Array.isArray(actions)
    ? { items }
    : {
        items,
        align: actions.align,
        confirmTimeout: actions.confirmTimeout,
      };
}
