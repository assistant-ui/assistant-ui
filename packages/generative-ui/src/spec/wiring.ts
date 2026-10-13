/**
 * The events each vocabulary component emits in spec mode. The first is the
 * one the component's own `$action` emits; a later event fires only through
 * the object prop named after it.
 */
const VOCABULARY_EVENTS: Readonly<Record<string, readonly string[]>> = {
  Form: ["submit"],
  Button: ["press"],
  Select: ["change"],
  Input: ["submit"],
  DatePicker: ["change"],
  Checkbox: ["change"],
  Slider: ["change"],
  RadioGroup: ["change"],
  CheckboxGroup: ["change"],
  Card: ["confirm", "cancel"],
  ListViewItem: ["press"],
};

/** The events a vocabulary component emits in spec mode, its own `$action` first. */
export const vocabularyEvents = (type: string): readonly string[] =>
  (Object.hasOwn(VOCABULARY_EVENTS, type)
    ? VOCABULARY_EVENTS[type]
    : undefined) ?? [];

// A control whose schema prop a spec binds with `$bindState` reads the controlled prop instead, so it stays mounted and reports every change through the binding context.
export const BOUND_VALUE_PROPS = [
  ["defaultValue", "value"],
  ["value", "value"],
  ["defaultChecked", "checked"],
] as const;
