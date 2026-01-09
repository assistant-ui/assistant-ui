import type { Action, ActionsConfig } from "./schema";

export type ActionsProp = ActionsConfig | Action[];

export function normalizeActionsConfig(
  actions?: ActionsProp,
): ActionsConfig | null {
  if (!actions) return null;

  const resolved = Array.isArray(actions)
    ? { items: actions }
    : {
        items: actions.items ?? [],
        align: actions.align,
        confirmTimeout: actions.confirmTimeout,
      };

  if (!resolved.items || resolved.items.length === 0) {
    return null;
  }

  return resolved;
}
