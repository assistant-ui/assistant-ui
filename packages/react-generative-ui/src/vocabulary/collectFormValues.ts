import type { FormEvent } from "react";
import {
  CHECKBOX_GROUP_ATTR,
  FIELD_NAME_ATTR,
  GENERATED_NAME_ATTR,
} from "../constants";

/**
 * The subset of `HTMLInputElement`/`HTMLSelectElement`/`HTMLTextAreaElement` that {@link collectFormValues} reads. A structural type rather than the DOM interfaces themselves, so a plain object can stand in for a form control in tests.
 */
export type FormControlElementLike = {
  readonly name: string;
  readonly type: string;
  readonly value: string;
  readonly checked?: boolean;
  readonly disabled: boolean;
  readonly hasAttribute: (name: string) => boolean;
  readonly getAttribute?: ((name: string) => string | null) | undefined;
  readonly matches?: ((selector: string) => boolean) | undefined;
};

/**
 * Collects a submitted form's named control values into a plain object, keyed by `name`, in document order. Reads each control's live DOM state rather than `FormData`, so a checkbox resolves to its `checked` boolean instead of an on/off string. A radio group resolves to its checked option's `value`, or `undefined` if none is checked. A checkbox group resolves to its checked options' values in document order, or an empty array if none is checked. Any other repeated `name` resolves to an array of its controls' values, in document order. Controls without a `name`, that carry `data-aui-generated-name`, or that are effectively disabled, including through an ancestor disabled fieldset outside its first legend, are skipped entirely.
 */
export function collectFormValues(
  elements: ArrayLike<FormControlElementLike>,
): Record<string, unknown> {
  const values: Record<string, unknown> = Object.create(null);

  for (const element of Array.from(elements)) {
    const { disabled } = element;
    const name = element.getAttribute?.(FIELD_NAME_ATTR) ?? element.name;
    if (
      !name ||
      disabled ||
      element.hasAttribute(GENERATED_NAME_ATTR) ||
      element.matches?.(":disabled")
    )
      continue;

    if (element.type === "radio") {
      if (element.checked) values[name] = element.value;
      else if (!Object.hasOwn(values, name)) values[name] = undefined;
      continue;
    }

    if (
      element.type === "checkbox" &&
      element.hasAttribute(CHECKBOX_GROUP_ATTR)
    ) {
      const existing = values[name];
      const checked = Array.isArray(existing) ? existing : [];
      values[name] = element.checked ? [...checked, element.value] : checked;
      continue;
    }

    const value: string | number | boolean =
      element.type === "checkbox"
        ? (element.checked ?? false)
        : element.type === "range"
          ? Number(element.value)
          : element.value;

    if (Object.hasOwn(values, name)) {
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

/**
 * Convenience wrapper around {@link collectFormValues} for a native form submit event; the cast from `HTMLFormControlsCollection` to `ArrayLike<FormControlElementLike>` lives here once instead of at every call site.
 */
export function collectFormValuesFromEvent(
  event: FormEvent<HTMLFormElement>,
): Record<string, unknown> {
  return collectFormValues(
    event.currentTarget
      .elements as unknown as ArrayLike<FormControlElementLike>,
  );
}
