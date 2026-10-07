import { hasFieldReference, resolveFieldReferences } from "../fieldReferences";
import type { Action } from "../ir";
import type { GenerativeUIDispatch } from "../types";
import type { A2uiBinding } from "../a2ui/BindingContext";
import { equalData } from "../a2ui/dataModel";
import { CHECKBOX_GROUP_ATTR, FIELD_NAME_ATTR } from "../constants";
import {
  collectFormValues,
  type FormControlElementLike,
} from "./collectFormValues";

export const actionAttr = (a: Action | undefined): string | undefined =>
  a ? JSON.stringify(a) : undefined;

const fieldValues = (
  source: Element,
  bindings?: ReadonlyMap<string, A2uiBinding>,
): Record<string, unknown> => {
  const scope = source.closest('form[data-aui], [data-aui="root"]');
  if (!scope) return {};
  const root = scope.closest('[data-aui="root"]');
  const controls = Array.from(
    scope.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea"),
  ).filter((control) => control.closest('[data-aui="root"]') === root);
  const values = collectFormValues(
    controls as ArrayLike<FormControlElementLike>,
  );
  if (!bindings) return values;
  const groups = new Map<string, Map<Element, FormControlElementLike[]>>();
  for (const control of controls) {
    const name = control.getAttribute(FIELD_NAME_ATTR) ?? control.name;
    if (!bindings.has(name)) continue;
    const field =
      groups.get(name) ?? new Map<Element, FormControlElementLike[]>();
    groups.set(name, field);
    const group =
      control.type === "radio" || control.hasAttribute(CHECKBOX_GROUP_ATTR)
        ? (control.closest("fieldset") ?? control)
        : control;
    const elements = field.get(group) ?? [];
    elements.push(control);
    field.set(group, elements);
  }
  for (const [name, field] of groups) {
    const candidates = [...field.values()]
      .map((elements) => collectFormValues(elements)[name])
      .filter((value) => value !== undefined);
    if (candidates.length > 0)
      values[name] =
        candidates.find(
          (value) => !equalData(value, bindings.get(name)!.value),
        ) ?? candidates[0];
  }
  return values;
};

/**
 * Fires `$action` through `$dispatch` when both are present, merging a runtime value into the payload under the reserved `$input` key (not `value`) so the user's input never clobbers a model-supplied `value` field. Each `{ "$field": name }` inside `$action` first resolves to the current value of the control with that `name` in the vocabulary form or generative UI root nearest to `source`, collected the way a `Form` collects it; a reference whose control is missing or holds no value resolves to its `fallback`, or is dropped without one. No-op when no registry is wired. The returned promise from an async handler is caught and re-thrown on a microtask so rejections surface rather than going unhandled.
 */
export const fire = (
  $action: Action | undefined,
  $dispatch: GenerativeUIDispatch | undefined,
  input?: unknown,
  source?: Element,
  bindings?: ReadonlyMap<string, A2uiBinding>,
) => {
  if (!$action || !$dispatch) return;
  const action =
    source && hasFieldReference($action)
      ? (resolveFieldReferences(
          $action,
          fieldValues(source, bindings),
        ) as Action)
      : $action;
  const payload = input === undefined ? action : { ...action, $input: input };
  void Promise.resolve($dispatch(payload)).catch((error) => {
    queueMicrotask(() => {
      throw error;
    });
  });
};
