import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import {
  CHECKBOX_GROUP_ATTR,
  FIELD_NAME_ATTR,
  GENERATED_NAME_ATTR,
} from "../constants";
import type { Action } from "../ir";
import { BUTTON_STYLES } from "../ir";
import type {
  GenerativeUIDispatch,
  GenerativeUILibrary,
  GenerativeUIStatus,
} from "../types";
import { useAnsweredValue } from "../answeredValues";
import { actionAttr, fire } from "./dispatch";
import { toTextContent } from "./toTextContent";
import { useRadioGroupName } from "../RadioGroupScope";

const optionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const describedOptionSchema = optionSchema.extend({
  description: z.string().optional(),
});

type Option = { label: string; description?: string; value: string };

const isOption = (option: unknown): option is Option =>
  option !== null &&
  typeof option === "object" &&
  "label" in option &&
  typeof option.label === "string" &&
  (!("description" in option) || typeof option.description === "string") &&
  "value" in option &&
  typeof option.value === "string";

const mapOptions = (
  options: unknown,
  render: (option: Option, key: string) => ReactNode,
) => {
  const occurrences = new Map<string, number>();
  return (Array.isArray(options) ? options : []).map((option) => {
    if (!isOption(option)) return null;
    const occurrence = occurrences.get(option.value) ?? 0;
    occurrences.set(option.value, occurrence + 1);
    return render(option, JSON.stringify([option.value, occurrence]));
  });
};

type RadioGroupRenderProps = {
  options: Option[];
  name?: string;
  label?: string;
  defaultValue?: string;
  children?: ReactNode;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function RadioGroupRender({
  options,
  name,
  label,
  defaultValue,
  children,
  $action,
  $dispatch,
}: RadioGroupRenderProps) {
  const groupName = useRadioGroupName(name);
  const answeredValue = useAnsweredValue(name);
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : defaultValue;
  return (
    <fieldset
      key={initialValue}
      data-aui="radiogroup"
      data-aui-action={actionAttr($action)}
      aria-label={label}
    >
      {mapOptions(options, (option, key) => (
        <label key={key} data-aui="radiogroup-option">
          <input
            type="radio"
            name={groupName}
            {...{ [FIELD_NAME_ATTR]: name }}
            {...(name == null ? { [GENERATED_NAME_ATTR]: "" } : {})}
            value={option.value}
            defaultChecked={initialValue === option.value}
            onChange={(e) =>
              fire($action, $dispatch, option.value, e.currentTarget)
            }
          />
          {option.description ? (
            <span data-aui="option-content">
              <span data-aui="option-label">{option.label}</span>
              <span data-aui="option-description">{option.description}</span>
            </span>
          ) : (
            option.label
          )}
        </label>
      ))}
      {children}
    </fieldset>
  );
}

type CheckboxGroupRenderProps = {
  options: Option[];
  name?: string;
  label?: string;
  defaultValue?: string[];
  children?: ReactNode;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

const checkedGroupValues = (input: HTMLInputElement): string[] =>
  Array.from(
    input
      .closest("fieldset")
      ?.querySelectorAll<HTMLInputElement>(
        `:scope > label > input[${CHECKBOX_GROUP_ATTR}]:checked`,
      ) ?? [],
    (checkbox) => checkbox.value,
  );

function CheckboxGroupRender({
  options,
  name,
  label,
  defaultValue,
  children,
  $action,
  $dispatch,
}: CheckboxGroupRenderProps) {
  const generatedName = useId();
  const fieldName = name ?? generatedName;
  const answeredValue = useAnsweredValue(name);
  const checkedValues =
    Array.isArray(answeredValue) &&
    answeredValue.every((value): value is string => typeof value === "string")
      ? answeredValue
      : Array.isArray(defaultValue)
        ? defaultValue
        : [];
  return (
    <fieldset
      key={JSON.stringify(checkedValues)}
      data-aui="checkboxgroup"
      data-aui-action={actionAttr($action)}
      aria-label={label}
    >
      {mapOptions(options, (option, key) => (
        <label key={key} data-aui="checkboxgroup-option">
          <input
            type="checkbox"
            name={fieldName}
            {...{ [CHECKBOX_GROUP_ATTR]: "" }}
            {...(name == null ? { [GENERATED_NAME_ATTR]: "" } : {})}
            value={option.value}
            defaultChecked={checkedValues.includes(option.value)}
            onChange={(e) =>
              fire(
                $action,
                $dispatch,
                checkedGroupValues(e.currentTarget),
                e.currentTarget,
              )
            }
          />
          {option.description ? (
            <span data-aui="option-content">
              <span data-aui="option-label">{option.label}</span>
              <span data-aui="option-description">{option.description}</span>
            </span>
          ) : (
            option.label
          )}
        </label>
      ))}
      {children}
    </fieldset>
  );
}

type SelectRenderProps = {
  options: Option[];
  placeholder?: string;
  label?: string;
  name?: string;
  defaultValue?: string;
  children?: ReactNode;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function SelectRender({
  options,
  placeholder,
  label,
  name,
  defaultValue,
  $action,
  $dispatch,
  children,
}: SelectRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const placeholderText = toTextContent(placeholder);
  const initialValue =
    typeof answeredValue === "string"
      ? answeredValue
      : typeof defaultValue === "string"
        ? defaultValue
        : "";
  return (
    <select
      key={initialValue}
      data-aui="select"
      data-aui-action={actionAttr($action)}
      name={name}
      aria-label={label}
      defaultValue={initialValue}
      onChange={(e) =>
        fire($action, $dispatch, e.currentTarget.value, e.currentTarget)
      }
    >
      {placeholderText ? (
        <option value="" disabled>
          {placeholderText}
        </option>
      ) : null}
      {mapOptions(options, (option, key) => (
        <option key={key} value={option.value}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
}

type InputRenderProps = {
  placeholder?: string;
  multiline?: boolean;
  label?: string;
  name?: string;
  defaultValue?: string;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function InputRender({
  placeholder,
  multiline,
  label,
  name,
  defaultValue,
  $action,
  $dispatch,
}: InputRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : defaultValue;
  const submit = (control: HTMLInputElement | HTMLTextAreaElement) =>
    fire($action, $dispatch, control.value, control);
  return multiline ? (
    <textarea
      key={initialValue}
      data-aui="input"
      data-aui-multiline
      data-aui-action={actionAttr($action)}
      name={name}
      aria-label={label}
      placeholder={placeholder}
      defaultValue={initialValue}
      onKeyDown={(e) => {
        if (
          e.key !== "Enter" ||
          !(e.ctrlKey || e.metaKey) ||
          e.nativeEvent.isComposing
        )
          return;
        if (e.currentTarget.form) {
          e.preventDefault();
          HTMLFormElement.prototype.requestSubmit.call(e.currentTarget.form);
        } else {
          submit(e.currentTarget);
        }
      }}
    />
  ) : (
    <input
      key={initialValue}
      data-aui="input"
      data-aui-action={actionAttr($action)}
      name={name}
      aria-label={label}
      placeholder={placeholder}
      defaultValue={initialValue}
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          !e.nativeEvent.isComposing &&
          !e.currentTarget.form
        )
          submit(e.currentTarget);
      }}
    />
  );
}

type DatePickerRenderProps = {
  value?: string;
  min?: string;
  max?: string;
  label?: string;
  name?: string;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function DatePickerRender({
  value,
  min,
  max,
  label,
  name,
  $action,
  $dispatch,
}: DatePickerRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : value;
  return (
    <input
      key={initialValue}
      type="date"
      data-aui="datepicker"
      data-aui-action={actionAttr($action)}
      name={name}
      aria-label={label}
      defaultValue={initialValue}
      min={min}
      max={max}
      onChange={(e) =>
        fire($action, $dispatch, e.currentTarget.value, e.currentTarget)
      }
    />
  );
}

type CheckboxRenderProps = {
  label: string;
  name?: string;
  defaultChecked?: boolean;
  variant?: "checkbox" | "switch";
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function CheckboxRender({
  label,
  name,
  defaultChecked,
  variant = "checkbox",
  $action,
  $dispatch,
}: CheckboxRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const initialChecked =
    typeof answeredValue === "boolean" ? answeredValue : defaultChecked;
  return (
    <label
      data-aui="checkbox"
      data-aui-variant={variant === "switch" ? variant : undefined}
    >
      <input
        key={String(initialChecked)}
        type="checkbox"
        role={variant === "switch" ? "switch" : undefined}
        data-aui-action={actionAttr($action)}
        name={name}
        defaultChecked={initialChecked}
        onChange={(e) =>
          fire($action, $dispatch, e.currentTarget.checked, e.currentTarget)
        }
      />
      <span data-aui="checkbox-label">{toTextContent(label)}</span>
    </label>
  );
}

const finiteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

type SliderRenderProps = {
  name?: string;
  label?: string;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

type SliderControlProps = {
  name?: string;
  label?: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
  unit?: string;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function SliderControl({
  name,
  label,
  min,
  max,
  step,
  initialValue,
  unit,
  $action,
  $dispatch,
}: SliderControlProps) {
  const [value, setValue] = useState(initialValue);
  const pointerActive = useRef(false);
  const keyboardActive = useRef(false);
  const lastCommitted = useRef(initialValue);
  const currentValue = (input: HTMLInputElement) =>
    clamp(Number(input.value), min, max);
  const commit = (input: HTMLInputElement) => {
    const nextValue = currentValue(input);
    setValue(nextValue);
    if (lastCommitted.current === nextValue) return;
    lastCommitted.current = nextValue;
    fire($action, $dispatch, nextValue, input);
  };

  return (
    <label data-aui="slider-field">
      {label ? <span data-aui="slider-label">{label}</span> : null}
      <input
        type="range"
        data-aui="slider"
        data-aui-action={actionAttr($action)}
        name={name}
        aria-label={label}
        aria-valuetext={unit ? `${value} ${unit}` : String(value)}
        min={min}
        max={max}
        step={step}
        defaultValue={initialValue}
        onInput={(e) => setValue(currentValue(e.currentTarget))}
        onPointerDown={() => {
          pointerActive.current = true;
        }}
        onPointerUp={(e) => {
          pointerActive.current = false;
          commit(e.currentTarget);
        }}
        onKeyDown={(e) => {
          keyboardActive.current = [
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "End",
            "Home",
            "PageDown",
            "PageUp",
          ].includes(e.key);
        }}
        onKeyUp={(e) => {
          if (!keyboardActive.current) return;
          keyboardActive.current = false;
          commit(e.currentTarget);
        }}
        onChange={(e) => {
          if (!pointerActive.current && !keyboardActive.current)
            commit(e.currentTarget);
        }}
      />
      <output data-aui="slider-value">
        {value}
        {unit ? ` ${unit}` : ""}
      </output>
    </label>
  );
}

function SliderRender({
  name,
  label,
  min,
  max,
  step,
  defaultValue,
  unit,
  $action,
  $dispatch,
}: SliderRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const safeMin = finiteNumber(min) ? min : 0;
  const safeMax = finiteNumber(max) ? Math.max(max, safeMin) : safeMin + 100;
  const safeStep = finiteNumber(step) && step > 0 ? step : 1;
  const defaultNumber = finiteNumber(defaultValue) ? defaultValue : safeMin;
  const initialValue = clamp(
    finiteNumber(answeredValue) ? answeredValue : defaultNumber,
    safeMin,
    safeMax,
  );
  return (
    <SliderControl
      key={`${safeMin}:${safeMax}:${safeStep}:${initialValue}`}
      min={safeMin}
      max={safeMax}
      step={safeStep}
      initialValue={initialValue}
      {...(name !== undefined ? { name } : {})}
      {...(label !== undefined ? { label } : {})}
      {...(unit !== undefined ? { unit } : {})}
      {...($action !== undefined ? { $action } : {})}
      {...($dispatch !== undefined ? { $dispatch } : {})}
    />
  );
}

const UNDO_WINDOW_SECONDS = 5;

type ButtonRenderProps = {
  label: string;
  buttonStyle?: (typeof BUTTON_STYLES)[number];
  block?: boolean;
  submit?: boolean;
  undoable?: boolean;
  children?: ReactNode;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function ButtonRender({
  label,
  buttonStyle,
  block,
  submit,
  undoable,
  children,
  $action,
  $dispatch,
}: ButtonRenderProps) {
  const [remaining, setRemaining] = useState<number | undefined>(undefined);
  const labelText = String(toTextContent(label) ?? "");
  const undoLabel = labelText.trim();
  const pendingAction = useRef<
    | {
        $action: Action;
        $dispatch: GenerativeUIDispatch;
        source: HTMLButtonElement;
      }
    | undefined
  >(undefined);
  const canUndo =
    undoable && !submit && $action !== undefined && $dispatch !== undefined;

  useEffect(() => {
    if (remaining === undefined) return;
    const timer = setTimeout(() => {
      if (remaining > 1) {
        setRemaining(remaining - 1);
        return;
      }
      const action = pendingAction.current;
      pendingAction.current = undefined;
      setRemaining(undefined);
      if (action)
        fire(action.$action, action.$dispatch, undefined, action.source);
    }, 1_000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const cancelUndo = () => {
    pendingAction.current = undefined;
    setRemaining(undefined);
  };

  return (
    <button
      type={submit ? "submit" : "button"}
      data-aui="button"
      data-aui-style={buttonStyle}
      data-aui-block={block || undefined}
      data-aui-submit={submit || undefined}
      data-aui-state={remaining === undefined ? undefined : "pending"}
      data-aui-action={actionAttr($action)}
      aria-label={
        remaining === undefined
          ? undefined
          : undoLabel
            ? `Undo ${undoLabel}`
            : "Undo"
      }
      onClick={
        submit
          ? undefined
          : canUndo
            ? (e) => {
                if (remaining !== undefined) {
                  cancelUndo();
                  return;
                }
                pendingAction.current = {
                  $action,
                  $dispatch,
                  source: e.currentTarget,
                };
                setRemaining(UNDO_WINDOW_SECONDS);
              }
            : (e) => fire($action, $dispatch, undefined, e.currentTarget)
      }
      onKeyDown={
        canUndo
          ? (e) => {
              if (e.key !== "Escape" || remaining === undefined) return;
              e.preventDefault();
              cancelUndo();
            }
          : undefined
      }
    >
      {remaining === undefined ? (
        <>
          {labelText}
          {children}
        </>
      ) : (
        <>
          Undo <span data-aui="button-countdown">{remaining}</span>
          <span data-aui="button-undo-status" role="status">
            {labelText} in {UNDO_WINDOW_SECONDS} seconds
          </span>
        </>
      )}
    </button>
  );
}

export const interactiveVocabulary = {
  Button: {
    description:
      "A clickable button. Carries `$action` describing the side effect or resume value. Set `submit` to submit an ancestor Form/Card instead of firing `$action` on click.",
    properties: z.object({
      label: z.string().describe("Button label."),
      buttonStyle: z.enum(BUTTON_STYLES).optional().describe("Visual style."),
      block: z
        .boolean()
        .optional()
        .describe("Whether the button spans the full width."),
      submit: z
        .boolean()
        .optional()
        .describe(
          "Render as a submit button for an ancestor Form/Card instead of a click button.",
        ),
      undoable: z
        .boolean()
        .optional()
        .describe(
          "Delay the action with an undo control, for sends and other hard-to-reverse actions.",
        ),
    }),
    render: ButtonRender,
  },
  Select: {
    description:
      "A dropdown selector. Carries `$action` describing the on-select behavior.",
    properties: z.object({
      options: z.array(optionSchema).describe("Selectable options."),
      placeholder: z
        .string()
        .optional()
        .describe("Placeholder shown when nothing is selected."),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
      name: z.string().optional().describe("Field name used inside a Form."),
      defaultValue: z.string().optional().describe("Initially selected value."),
    }),
    render: SelectRender,
  },
  Input: {
    description:
      "A text input. Carries `$action` describing the on-submit behavior.",
    properties: z.object({
      placeholder: z.string().optional().describe("Placeholder text."),
      multiline: z
        .boolean()
        .optional()
        .describe("Render a textarea instead of a single-line input."),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
      name: z.string().optional().describe("Field name used inside a Form."),
      defaultValue: z.string().optional().describe("Initial text."),
    }),
    render: InputRender,
  },
  DatePicker: {
    description:
      "A date input. Carries `$action` describing the on-select behavior.",
    properties: z.object({
      value: z.string().optional().describe("Initial date (YYYY-MM-DD)."),
      min: z.string().optional().describe("Minimum date (YYYY-MM-DD)."),
      max: z.string().optional().describe("Maximum date (YYYY-MM-DD)."),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
      name: z.string().optional().describe("Field name used inside a Form."),
    }),
    render: DatePickerRender,
  },
  Checkbox: {
    description:
      "A checkbox with a label. Carries `$action` describing the on-change behavior.",
    properties: z.object({
      label: z.string().describe("Label text next to the checkbox."),
      name: z.string().optional().describe("Field name used inside a Form."),
      defaultChecked: z
        .boolean()
        .optional()
        .describe("Whether the checkbox starts checked."),
      variant: z
        .enum(["checkbox", "switch"])
        .optional()
        .describe("Whether to render a checkbox or switch."),
    }),
    render: CheckboxRender,
  },
  Slider: {
    description:
      "A numeric range control. Carries `$action` describing the committed value.",
    properties: z.object({
      name: z.string().optional().describe("Field name used inside a Form."),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
      min: z.number().describe("Minimum value."),
      max: z.number().describe("Maximum value."),
      step: z.number().optional().describe("Value increment. Defaults to 1."),
      defaultValue: z.number().optional().describe("Initial value."),
      unit: z.string().optional().describe("Unit shown with the value."),
    }),
    render: SliderRender,
  },
  RadioGroup: {
    description:
      "A group of mutually exclusive radio options. Carries `$action` describing the on-change behavior.",
    properties: z.object({
      options: z.array(describedOptionSchema).describe("Selectable options."),
      name: z.string().optional().describe("Field name used inside a Form."),
      label: z.string().optional().describe("Accessible name for the group."),
      defaultValue: z.string().optional().describe("Initially selected value."),
    }),
    render: RadioGroupRender,
  },
  CheckboxGroup: {
    description:
      "A group of checkbox options where any number can be checked. Carries `$action` describing the on-change behavior.",
    properties: z.object({
      options: z.array(describedOptionSchema).describe("Selectable options."),
      name: z.string().optional().describe("Field name used inside a Form."),
      label: z.string().optional().describe("Accessible name for the group."),
      defaultValue: z
        .array(z.string())
        .optional()
        .describe("Initially checked values."),
    }),
    render: CheckboxGroupRender,
  },
} satisfies GenerativeUILibrary;
