import { hasFieldReference, resolveFieldReferences } from "../fieldReferences";
import type { Action } from "../ir";
import type { GenerativeUIDispatch } from "../types";
import {
  collectFormValues,
  type FormControlElementLike,
} from "./collectFormValues";

export const actionAttr = (a: Action | undefined): string | undefined =>
  a ? JSON.stringify(a) : undefined;

const fieldValues = (source: Element): Record<string, unknown> => {
  const scope = source.closest('form[data-aui], [data-aui="root"]');
  return scope
    ? collectFormValues(
        scope.querySelectorAll(
          "input, select, textarea",
        ) as unknown as ArrayLike<FormControlElementLike>,
      )
    : {};
};

/**
 * Fires `$action` through `$dispatch` when both are present, merging a runtime value into the payload under the reserved `$input` key (not `value`) so the user's input never clobbers a model-supplied `value` field. Each `{ "$field": name }` inside `$action` first resolves to the current value of the control with that `name` in the vocabulary form or generative UI root nearest to `source`, collected the way a `Form` collects it; a reference with no such control, or whose control holds no value, is dropped. No-op when no registry is wired. The returned promise from an async handler is caught and re-thrown on a microtask so rejections surface rather than going unhandled.
 */
export const fire = (
  $action: Action | undefined,
  $dispatch: GenerativeUIDispatch | undefined,
  input?: unknown,
  source?: Element,
) => {
  if (!$action || !$dispatch) return;
  const action =
    source && hasFieldReference($action)
      ? (resolveFieldReferences($action, fieldValues(source)) as Action)
      : $action;
  const payload = input === undefined ? action : { ...action, $input: input };
  void Promise.resolve($dispatch(payload)).catch((error) => {
    queueMicrotask(() => {
      throw error;
    });
  });
};
