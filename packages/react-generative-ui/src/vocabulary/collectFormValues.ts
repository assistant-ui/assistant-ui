/**
 * The subset of `HTMLInputElement`/`HTMLSelectElement`/`HTMLTextAreaElement` that {@link collectFormValues} reads. A structural type rather than the DOM interfaces themselves, so a plain object can stand in for a form control in tests.
 */
export type FormControlElementLike = {
  readonly name: string;
  readonly type: string;
  readonly value: string;
  readonly checked?: boolean;
  readonly disabled: boolean;
};

/**
 * Collects a submitted form's named control values into a plain object, keyed by `name`, in document order. Reads each control's live DOM state rather than `FormData`, so a checkbox resolves to its `checked` boolean instead of an on/off string. A radio group resolves to its checked option's `value`, or `undefined` if none is checked. Any other repeated `name` resolves to an array of its controls' values, in document order. Controls without a `name`, or that are `disabled`, are skipped entirely.
 */
export function collectFormValues(
  elements: ArrayLike<FormControlElementLike>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const element of Array.from(elements)) {
    const { name, disabled } = element;
    if (!name || disabled) continue;

    if (element.type === "radio") {
      if (element.checked) values[name] = element.value;
      else if (!(name in values)) values[name] = undefined;
      continue;
    }

    const value: string | boolean =
      element.type === "checkbox" ? (element.checked ?? false) : element.value;

    if (name in values) {
      const existing = values[name];
      values[name] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    } else {
      values[name] = value;
    }
  }

  return values;
}
