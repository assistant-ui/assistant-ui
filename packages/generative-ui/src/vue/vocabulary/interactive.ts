import {
  defineComponent,
  h,
  onMounted,
  onUpdated,
  onUnmounted,
  ref,
  useId,
  watch,
} from "vue";
import { useSpecElement } from "generative-frame/spec/vue";
import {
  CHECKBOX_GROUP_ATTR,
  FIELD_NAME_ATTR,
  FIELD_VALUE_ATTR,
  GENERATED_NAME_ATTR,
} from "../../constants";
import { interactiveDefinitions } from "../../vocabulary/definitions/interactive";
import { BOUND_VALUE_PROPS } from "../../spec/catalogDefinitions";
import {
  clamp,
  finiteNumber,
  mapOptions,
  UNDO_WINDOW_SECONDS,
} from "../../vocabulary/interactiveValues";
import { toTextContent } from "../../vocabulary/toTextContent";
import {
  classifyTemporal,
  fromLocalDateTime,
  getTemporalInputStep,
  normalizeTemporalInputValue,
  toLocalDateTime,
  toPickerLocalDateTime,
} from "../../temporal";

const useEventProps = (event: "press" | "change" | "submit") => {
  const context = useSpecElement();
  const live = () => Object.hasOwn(context.element.on ?? {}, event);
  const action = () => (live() ? JSON.stringify({ type: event }) : undefined);
  const boundProp = () =>
    BOUND_VALUE_PROPS.map(([prop]) => prop).find((prop) =>
      Object.hasOwn(context.bindings, prop),
    );
  return { context, live, action, boundProp };
};

const fieldName = (name: unknown, id: string, bound: boolean) =>
  typeof name === "string" ? name : bound ? id : undefined;

const isComposing = (event: KeyboardEvent) =>
  event.isComposing || event.keyCode === 229;
const target = <T extends HTMLElement>(event: Event) =>
  event.currentTarget as T;

export const interactiveVocabulary = {
  Button: {
    ...interactiveDefinitions.Button,
    component: defineComponent({
      name: "GenerativeUIButton",
      props: ["label", "buttonStyle", "block", "submit", "undoable"],
      emits: ["press"],
      setup: function useButton(props, { emit, slots }) {
        const { live, action } = useEventProps("press");
        const remaining = ref<number>();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const cancel = () => {
          remaining.value = undefined;
          clearTimeout(timer);
        };
        onUnmounted(cancel);
        const tick = () => {
          timer = setTimeout(() => {
            if (remaining.value === undefined) return;
            if (remaining.value > 1) {
              remaining.value--;
              tick();
            } else {
              remaining.value = undefined;
              emit("press", undefined);
            }
          }, 1000);
        };
        return () => {
          const label = String(toTextContent(props.label) ?? "");
          const undo = label.trim();
          const canUndo = props.undoable && !props.submit && live();
          return h(
            "button",
            {
              type: props.submit ? "submit" : "button",
              "data-aui": "button",
              "data-aui-style": props.buttonStyle,
              "data-aui-block": props.block || undefined,
              "data-aui-submit": props.submit || undefined,
              "data-aui-state":
                remaining.value === undefined ? undefined : "pending",
              "data-aui-action": action(),
              "aria-label":
                remaining.value === undefined
                  ? undefined
                  : undo
                    ? `Undo ${undo}`
                    : "Undo",
              onClick: props.submit
                ? undefined
                : () => {
                    if (canUndo) {
                      if (remaining.value !== undefined) cancel();
                      else {
                        remaining.value = UNDO_WINDOW_SECONDS;
                        tick();
                      }
                    } else if (live()) emit("press", undefined);
                  },
              onKeydown: canUndo
                ? (event: KeyboardEvent) => {
                    if (
                      event.key === "Escape" &&
                      remaining.value !== undefined
                    ) {
                      event.preventDefault();
                      cancel();
                    }
                  }
                : undefined,
            },
            remaining.value === undefined
              ? [label, ...(slots.default?.() ?? [])]
              : [
                  "Undo ",
                  h(
                    "span",
                    { "data-aui": "button-countdown" },
                    String(remaining.value),
                  ),
                  h(
                    "span",
                    { "data-aui": "button-undo-status", role: "status" },
                    `${label} in ${UNDO_WINDOW_SECONDS} seconds`,
                  ),
                ],
          );
        };
      },
    }),
  },
  Select: {
    ...interactiveDefinitions.Select,
    component: defineComponent({
      name: "GenerativeUISelect",
      props: [
        "options",
        "placeholder",
        "label",
        "name",
        "defaultValue",
        "value",
      ],
      emits: ["change", "update:defaultValue", "update:value"],
      setup: function useSelect(props, { emit, slots }) {
        const { context, live, action, boundProp } = useEventProps("change");
        const bound = () => boundProp() !== undefined;
        const firstValue = ref(
          bound() ? String(props.value ?? props.defaultValue ?? "") : "",
        );
        watch(
          bound,
          (next) => {
            if (next)
              firstValue.value = String(
                props.value ?? props.defaultValue ?? "",
              );
          },
          { flush: "sync" },
        );
        const control = ref<HTMLSelectElement>();
        let selectedValue: string | undefined;
        watch(
          () => props.defaultValue,
          () => {
            selectedValue = undefined;
          },
          { flush: "sync" },
        );
        onUpdated(() => {
          if (!control.value) return;
          if (!bound()) {
            const value = selectedValue ?? props.defaultValue;
            for (const option of control.value.options)
              if (option.value === value) option.selected = true;
            return;
          }
          control.value.value = String(props.value ?? props.defaultValue ?? "");
          if (control.value.value !== firstValue.value)
            for (const option of control.value.options)
              option.removeAttribute("selected");
        });
        return () => {
          const selected = bound()
            ? firstValue.value
            : typeof props.defaultValue === "string"
              ? props.defaultValue
              : "";
          const placeholder = toTextContent(props.placeholder);
          return h(
            "select",
            {
              ref: control,
              ...(bound() ? {} : { key: selected }),
              "data-aui": "select",
              "data-aui-action": action(),
              name: fieldName(props.name, context.id, bound()),
              "aria-label": props.label,
              onChange: (event: Event) => {
                const next = target<HTMLSelectElement>(event).value;
                if (!bound()) selectedValue = next;
                if (bound())
                  emit(
                    `update:${boundProp()}` as
                      | "update:defaultValue"
                      | "update:value",
                    next,
                  );
                if (live()) emit("change", next);
              },
            },
            [
              ...(placeholder
                ? [
                    h(
                      "option",
                      {
                        value: "",
                        disabled: true,
                        selected: selected === "",
                      },
                      String(placeholder),
                    ),
                  ]
                : []),
              ...mapOptions(props.options, (option, key) =>
                h(
                  "option",
                  {
                    key,
                    value: option.value,
                    selected: selected === option.value,
                  },
                  option.label,
                ),
              ).filter((option) => option !== null),
              ...(slots.default?.() ?? []),
            ],
          );
        };
      },
    }),
  },
  Input: {
    ...interactiveDefinitions.Input,
    component: defineComponent({
      name: "GenerativeUIInput",
      props: [
        "value",
        "inputType",
        "placeholder",
        "multiline",
        "label",
        "name",
        "defaultValue",
      ],
      emits: ["submit", "update:defaultValue", "update:value"],
      setup: function useInput(props, { emit }) {
        const { context, live, action, boundProp } = useEventProps("submit");
        const bound = () => boundProp() !== undefined;
        const local = ref(props.defaultValue);
        const control = ref<HTMLInputElement>();
        watch(
          () => props.defaultValue,
          (next) => {
            if (!bound()) local.value = next;
          },
          { flush: "sync" },
        );
        onUpdated(() => {
          if (bound() || !control.value) return;
          if (props.defaultValue === undefined)
            control.value.removeAttribute("value");
          else control.value.defaultValue = String(props.defaultValue);
        });
        return () => {
          const multiline =
            props.multiline &&
            (props.inputType === undefined || props.inputType === "text");
          const name = fieldName(props.name, context.id, bound());
          const value = bound()
            ? (props.value ?? props.defaultValue ?? "")
            : local.value;
          const attrs = {
            ...(!bound() && props.defaultValue !== undefined
              ? { key: String(props.defaultValue) }
              : {}),
            "data-aui": "input",
            "data-aui-action": action(),
            name,
            "aria-label": props.label,
            placeholder: props.placeholder,
            onInput: (event: Event) => {
              const next = target<HTMLInputElement | HTMLTextAreaElement>(
                event,
              ).value;
              if (bound())
                emit(
                  `update:${boundProp()}` as
                    | "update:defaultValue"
                    | "update:value",
                  next,
                );
              else local.value = next;
            },
            onKeydown: (event: KeyboardEvent) => {
              const control = target<HTMLInputElement | HTMLTextAreaElement>(
                event,
              );
              if (isComposing(event) || event.key !== "Enter") return;
              if (multiline) {
                if (!(event.ctrlKey || event.metaKey)) return;
                if (control.form) {
                  event.preventDefault();
                  HTMLFormElement.prototype.requestSubmit.call(control.form);
                } else if (live()) emit("submit", control.value);
              } else if (!control.form && live()) emit("submit", control.value);
            },
          };
          return multiline
            ? h(
                "textarea",
                {
                  ...attrs,
                  "data-aui-multiline": "true",
                  ...(bound() ? { value } : {}),
                },
                bound() || props.defaultValue === undefined
                  ? undefined
                  : String(props.defaultValue),
              )
            : h("input", {
                ...attrs,
                ref: control,
                type: props.inputType,
                step: props.inputType === "number" ? "any" : undefined,
                value,
              });
        };
      },
    }),
  },
  DatePicker: {
    ...interactiveDefinitions.DatePicker,
    component: defineComponent({
      name: "GenerativeUIDatePicker",
      props: ["inputType", "value", "min", "max", "label", "name"],
      emits: ["change", "update:value"],
      setup: function useDatePicker(props, { emit }) {
        const { context, live, action, boundProp } = useEventProps("change");
        const hydrated = ref(false);
        onMounted(() => {
          hydrated.value = true;
        });
        const bound = () => boundProp() !== undefined;
        const initial = () =>
          typeof props.value === "string" ? props.value : undefined;
        const selection = ref({
          initialValue: initial(),
          value: initial(),
          anchor: initial(),
          committedValue: initial(),
          edited: false,
        });
        let keyboardActive = false;
        watch(
          initial,
          (next) => {
            const prior = selection.value;
            if (prior.initialValue === next) return;
            const echo = bound() && next === prior.value;
            selection.value = {
              initialValue: next,
              value: next,
              anchor: echo ? prior.anchor : next,
              committedValue: echo ? prior.committedValue : next,
              edited: echo && prior.edited,
            };
          },
          { flush: "sync" },
        );
        const inputType = () => props.inputType ?? "date";
        const valueFromInput = (input: HTMLInputElement) => {
          const value = normalizeTemporalInputValue(input.value);
          return inputType() === "datetime"
            ? fromLocalDateTime(value, selection.value.anchor)
            : value;
        };
        const commit = (input: HTMLInputElement) => {
          if (!selection.value.edited) return;
          const next = valueFromInput(input);
          const previous = selection.value.committedValue;
          selection.value = {
            ...selection.value,
            committedValue: next,
            edited: false,
          };
          if (next !== previous && live()) emit("change", next);
        };
        return () => {
          const kind = inputType();
          const current = bound() ? initial() : selection.value.value;
          const anchor = classifyTemporal(selection.value.anchor ?? "");
          const instant = kind === "datetime" && anchor.kind === "instant";
          const showRawValue =
            kind === "datetime" &&
            classifyTemporal(current ?? "").kind === "instant" &&
            !hydrated.value;
          const display =
            current === undefined
              ? undefined
              : kind === "datetime" && hydrated.value
                ? toPickerLocalDateTime(current)
                : normalizeTemporalInputValue(current);
          const canonical = (value: string | undefined) => {
            const raw = value ?? "";
            const type = classifyTemporal(raw).kind;
            if (kind === "time")
              return type === "time" && normalizeTemporalInputValue(raw) !== raw
                ? value
                : undefined;
            if (kind !== "datetime") return undefined;
            if (type === "instant") return value;
            if (instant) return selection.value.anchor;
            return type === "floating" &&
              normalizeTemporalInputValue(raw) !== raw
              ? value
              : undefined;
          };
          const limit = (value: unknown) => {
            if (typeof value !== "string") return undefined;
            const precision = classifyTemporal(value);
            return normalizeTemporalInputValue(
              kind === "datetime" && hydrated.value
                ? toLocalDateTime(
                    value,
                    precision.kind === "instant"
                      ? precision.precision
                      : undefined,
                  )
                : value,
            );
          };
          return h("input", {
            ...(!bound() && initial() !== undefined ? { key: initial()! } : {}),
            type: showRawValue
              ? "text"
              : kind === "datetime"
                ? "datetime-local"
                : kind,
            readOnly: showRawValue || undefined,
            "data-aui": "datepicker",
            "data-aui-action": action(),
            [FIELD_VALUE_ATTR]: canonical(current),
            name: fieldName(props.name, context.id, bound()),
            "aria-label": props.label,
            value: display ?? (bound() || kind === "datetime" ? "" : undefined),
            min: limit(props.min),
            max: limit(props.max),
            step:
              kind !== "date"
                ? getTemporalInputStep(
                    selection.value.anchor,
                    instant ? display : current,
                    props.min,
                    props.max,
                  )
                : undefined,
            onInput: (event: Event) => {
              const control = target<HTMLInputElement>(event);
              const next = valueFromInput(control);
              const fieldValue = canonical(next);
              if (fieldValue !== undefined)
                control.setAttribute(FIELD_VALUE_ATTR, fieldValue);
              else control.removeAttribute(FIELD_VALUE_ATTR);
              const typed = keyboardActive;
              keyboardActive = false;
              const previous = selection.value.committedValue;
              selection.value = {
                initialValue: initial(),
                value: next,
                anchor: selection.value.anchor,
                committedValue: typed ? previous : next,
                edited: typed,
              };
              if (bound()) emit("update:value", next);
              if (!typed && next !== previous && live()) emit("change", next);
            },
            onBlur: (event: Event) => {
              keyboardActive = false;
              commit(target<HTMLInputElement>(event));
            },
            onKeydown: (event: KeyboardEvent) => {
              const control = target<HTMLInputElement>(event);
              if (
                event.key === "Enter" &&
                !isComposing(event) &&
                !control.form
              ) {
                commit(control);
                return;
              }
              keyboardActive =
                !event.altKey &&
                !event.ctrlKey &&
                !event.metaKey &&
                (event.key.length === 1 ||
                  [
                    "ArrowDown",
                    "ArrowUp",
                    "Backspace",
                    "Delete",
                    "End",
                    "Home",
                    "PageDown",
                    "PageUp",
                  ].includes(event.key));
            },
            onKeyup: () => {
              keyboardActive = false;
            },
            onPaste: () => {
              keyboardActive = true;
            },
            onCut: () => {
              keyboardActive = true;
            },
          });
        };
      },
    }),
  },
  Checkbox: {
    ...interactiveDefinitions.Checkbox,
    component: defineComponent({
      name: "GenerativeUICheckbox",
      props: ["checked", "label", "name", "defaultChecked", "variant"],
      emits: ["change", "update:defaultChecked"],
      setup: function useCheckbox(props, { emit }) {
        const { context, live, action, boundProp } = useEventProps("change");
        const bound = () => boundProp() !== undefined;
        const firstChecked = ref(
          (bound()
            ? (props.checked ?? props.defaultChecked)
            : props.defaultChecked) === true,
        );
        watch(
          bound,
          (next) => {
            if (next)
              firstChecked.value =
                (props.checked ?? props.defaultChecked) === true;
          },
          { flush: "sync" },
        );
        const input = ref<HTMLInputElement>();
        onUpdated(() => {
          if (bound() && input.value)
            input.value.checked =
              (props.checked ?? props.defaultChecked) === true;
        });
        return () => {
          const variant = props.variant ?? "checkbox";
          const checked = bound()
            ? firstChecked.value
            : props.defaultChecked === true;
          return h(
            "label",
            {
              "data-aui": "checkbox",
              "data-aui-variant": variant === "switch" ? variant : undefined,
            },
            [
              h("input", {
                ref: input,
                ...(bound() ? {} : { key: String(checked) }),
                type: "checkbox",
                role: variant === "switch" ? "switch" : undefined,
                "data-aui-action": action(),
                name: fieldName(props.name, context.id, bound()),
                checked,
                onChange: (event: Event) => {
                  const value = target<HTMLInputElement>(event).checked;
                  if (bound()) emit("update:defaultChecked", value);
                  if (live()) emit("change", value);
                },
              }),
              h(
                "span",
                { "data-aui": "checkbox-label" },
                String(toTextContent(props.label) ?? ""),
              ),
            ],
          );
        };
      },
    }),
  },
  Slider: {
    ...interactiveDefinitions.Slider,
    component: defineComponent({
      name: "GenerativeUISlider",
      props: [
        "value",
        "name",
        "label",
        "min",
        "max",
        "step",
        "defaultValue",
        "unit",
      ],
      emits: ["change", "update:defaultValue", "update:value"],
      setup: function useSlider(props, { emit }) {
        const { context, live, action, boundProp } = useEventProps("change");
        const bound = () => boundProp() !== undefined;
        const minimum = () => (finiteNumber(props.min) ? props.min : 0);
        const maximum = () =>
          finiteNumber(props.max)
            ? Math.max(props.max, minimum())
            : minimum() + 100;
        const step = () =>
          finiteNumber(props.step) && props.step > 0 ? props.step : 1;
        const initial = () =>
          clamp(
            finiteNumber(
              bound()
                ? (props.value ?? props.defaultValue)
                : props.defaultValue,
            )
              ? bound()
                ? (props.value ?? props.defaultValue)
                : props.defaultValue
              : minimum(),
            minimum(),
            maximum(),
          );
        const local = ref(initial());
        const input = ref<HTMLInputElement>();
        onUpdated(() => {
          if (!input.value) return;
          if (bound()) input.value.value = String(initial());
          else input.value.defaultValue = String(initial());
        });
        let pointer = false;
        let keyboard = false;
        let adjusting = false;
        let lastCommitted = initial();
        const controlKey = () =>
          `${minimum()}:${maximum()}:${step()}:${bound() ? "bound" : initial()}`;
        watch(
          controlKey,
          () => {
            if (!bound()) {
              local.value = initial();
              lastCommitted = initial();
            }
          },
          { flush: "sync" },
        );
        const current = (input: HTMLInputElement) =>
          clamp(Number(input.value), minimum(), maximum());
        const start = () => {
          adjusting = true;
          if (bound()) lastCommitted = initial();
        };
        const commit = (input: HTMLInputElement) => {
          adjusting = false;
          const next = current(input);
          if (!bound()) local.value = next;
          if (lastCommitted !== next) {
            lastCommitted = next;
            if (live()) emit("change", next);
          }
        };
        return () => {
          const value = bound() ? initial() : local.value;
          return h("label", { key: controlKey(), "data-aui": "slider-field" }, [
            ...(props.label
              ? [h("span", { "data-aui": "slider-label" }, String(props.label))]
              : []),
            h("input", {
              ref: input,
              type: "range",
              "data-aui": "slider",
              "data-aui-action": action(),
              name: fieldName(props.name, context.id, bound()),
              "aria-label": props.label,
              "aria-valuetext": props.unit
                ? `${value} ${props.unit}`
                : String(value),
              min: minimum(),
              max: maximum(),
              step: step(),
              value,
              onInput: (event: Event) => {
                const next = current(target<HTMLInputElement>(event));
                if (!bound()) local.value = next;
                else {
                  if (!adjusting) start();
                  emit(
                    `update:${boundProp()}` as
                      | "update:defaultValue"
                      | "update:value",
                    next,
                  );
                }
              },
              onPointerdown: () => {
                pointer = true;
                start();
              },
              onPointerup: (event: Event) => {
                pointer = false;
                commit(target<HTMLInputElement>(event));
              },
              onKeydown: (event: KeyboardEvent) => {
                keyboard = [
                  "ArrowDown",
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "End",
                  "Home",
                  "PageDown",
                  "PageUp",
                ].includes(event.key);
                if (keyboard && !event.repeat) start();
              },
              onKeyup: (event: KeyboardEvent) => {
                if (keyboard) {
                  keyboard = false;
                  commit(target<HTMLInputElement>(event));
                }
              },
              onChange: (event: Event) => {
                if (!pointer && !keyboard)
                  commit(target<HTMLInputElement>(event));
              },
            }),
            h(
              "output",
              { "data-aui": "slider-value" },
              `${value}${props.unit ? ` ${props.unit}` : ""}`,
            ),
          ]);
        };
      },
    }),
  },
  RadioGroup: {
    ...interactiveDefinitions.RadioGroup,
    component: defineComponent({
      name: "GenerativeUIRadioGroup",
      props: ["value", "options", "name", "label", "defaultValue"],
      emits: ["change", "update:defaultValue", "update:value"],
      setup: function useRadioGroup(props, { emit, slots }) {
        const { context, live, action, boundProp } = useEventProps("change");
        const bound = () => boundProp() !== undefined;
        const firstValue = ref(
          bound() ? (props.value ?? props.defaultValue) : undefined,
        );
        watch(
          bound,
          (next) => {
            if (next) firstValue.value = props.value ?? props.defaultValue;
          },
          { flush: "sync" },
        );
        const fieldset = ref<HTMLFieldSetElement>();
        onUpdated(() => {
          if (!bound() || !fieldset.value) return;
          for (const input of fieldset.value.querySelectorAll<HTMLInputElement>(
            'input[type="radio"]',
          ))
            input.checked = input.value === (props.value ?? props.defaultValue);
        });
        const name = () => fieldName(props.name, context.id, bound());
        const generatedName = useId();
        return () =>
          h(
            "fieldset",
            {
              ref: fieldset,
              ...(!bound() && props.defaultValue !== undefined
                ? { key: String(props.defaultValue) }
                : {}),
              "data-aui": "radiogroup",
              "data-aui-action": action(),
              "aria-label": props.label,
            },
            [
              ...mapOptions(props.options, (option, key) =>
                h("label", { key, "data-aui": "radiogroup-option" }, [
                  h("input", {
                    type: "radio",
                    name: name() ?? generatedName,
                    [FIELD_NAME_ATTR]: name(),
                    [GENERATED_NAME_ATTR]: name() == null ? "" : undefined,
                    value: option.value,
                    checked:
                      (bound() ? firstValue.value : props.defaultValue) ===
                      option.value,
                    onChange: () => {
                      if (bound())
                        emit(
                          `update:${boundProp()}` as
                            | "update:defaultValue"
                            | "update:value",
                          option.value,
                        );
                      if (live()) emit("change", option.value);
                    },
                  }),
                  ...(option.description
                    ? [
                        h("span", { "data-aui": "option-content" }, [
                          h(
                            "span",
                            { "data-aui": "option-label" },
                            option.label,
                          ),
                          h(
                            "span",
                            { "data-aui": "option-description" },
                            option.description,
                          ),
                        ]),
                      ]
                    : [option.label]),
                ]),
              ).filter((option) => option !== null),
              ...(slots.default?.() ?? []),
            ],
          );
      },
    }),
  },
  CheckboxGroup: {
    ...interactiveDefinitions.CheckboxGroup,
    component: defineComponent({
      name: "GenerativeUICheckboxGroup",
      props: ["value", "options", "name", "label", "defaultValue"],
      emits: ["change", "update:defaultValue", "update:value"],
      setup: function useCheckboxGroup(props, { emit, slots }) {
        const { context, live, action, boundProp } = useEventProps("change");
        const bound = () => boundProp() !== undefined;
        const firstValue = ref<string[]>(
          Array.isArray(props.value ?? props.defaultValue)
            ? (props.value ?? props.defaultValue)
            : [],
        );
        watch(
          bound,
          (next) => {
            if (next)
              firstValue.value = Array.isArray(
                props.value ?? props.defaultValue,
              )
                ? (props.value ?? props.defaultValue)
                : [];
          },
          { flush: "sync" },
        );
        const fieldset = ref<HTMLFieldSetElement>();
        onUpdated(() => {
          if (!bound() || !fieldset.value) return;
          const checked: string[] = Array.isArray(
            props.value ?? props.defaultValue,
          )
            ? (props.value ?? props.defaultValue)
            : [];
          for (const input of fieldset.value.querySelectorAll<HTMLInputElement>(
            'input[type="checkbox"]',
          ))
            input.checked = checked.includes(input.value);
        });
        const name = () => fieldName(props.name, context.id, bound());
        const generatedName = useId();
        return () => {
          const checked: string[] = bound()
            ? firstValue.value
            : Array.isArray(props.defaultValue)
              ? props.defaultValue
              : [];
          return h(
            "fieldset",
            {
              ref: fieldset,
              ...(bound() ? {} : { key: JSON.stringify(checked) }),
              "data-aui": "checkboxgroup",
              "data-aui-action": action(),
              "aria-label": props.label,
            },
            [
              ...mapOptions(props.options, (option, key) =>
                h("label", { key, "data-aui": "checkboxgroup-option" }, [
                  h("input", {
                    type: "checkbox",
                    name: name() ?? generatedName,
                    [CHECKBOX_GROUP_ATTR]: "",
                    [GENERATED_NAME_ATTR]: name() == null ? "" : undefined,
                    value: option.value,
                    checked: checked.includes(option.value),
                    onChange: (event: Event) => {
                      const input = target<HTMLInputElement>(event);
                      const selected = Array.from(
                        input
                          .closest("fieldset")
                          ?.querySelectorAll<HTMLInputElement>(
                            `:scope > label > input[${CHECKBOX_GROUP_ATTR}]:checked`,
                          ) ?? [],
                        (checkbox) => checkbox.value,
                      );
                      if (bound())
                        emit(
                          `update:${boundProp()}` as
                            | "update:defaultValue"
                            | "update:value",
                          selected,
                        );
                      if (live()) emit("change", selected);
                    },
                  }),
                  ...(option.description
                    ? [
                        h("span", { "data-aui": "option-content" }, [
                          h(
                            "span",
                            { "data-aui": "option-label" },
                            option.label,
                          ),
                          h(
                            "span",
                            { "data-aui": "option-description" },
                            option.description,
                          ),
                        ]),
                      ]
                    : [option.label]),
                ]),
              ).filter((option) => option !== null),
              ...(slots.default?.() ?? []),
            ],
          );
        };
      },
    }),
  },
};
