import { useId, type ReactNode } from "react";
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
import { actionAttr, fire } from "./dispatch";
import { toTextContent } from "./toTextContent";
import { useNativeForm } from "./NativeFormContext";

const optionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

type Option = { label: string; value: string };

const isOption = (option: unknown): option is Option =>
  option !== null &&
  typeof option === "object" &&
  "label" in option &&
  typeof option.label === "string" &&
  "value" in option &&
  typeof option.value === "string";

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
  const generatedName = useId();
  const inForm = useNativeForm();
  const groupName = inForm ? (name ?? generatedName) : generatedName;
  const safeOptions = Array.isArray(options) ? options : [];
  return (
    <fieldset
      key={defaultValue}
      data-aui="radiogroup"
      data-aui-action={actionAttr($action)}
      aria-label={label}
    >
      {safeOptions.map((option, i) =>
        isOption(option) ? (
          <label key={i} data-aui="radiogroup-option">
            <input
              type="radio"
              name={groupName}
              {...{ [FIELD_NAME_ATTR]: name }}
              {...(name == null ? { [GENERATED_NAME_ATTR]: "" } : {})}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              onChange={(e) =>
                fire($action, $dispatch, option.value, e.currentTarget)
              }
            />
            {option.label}
          </label>
        ) : null,
      )}
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
  const safeOptions = Array.isArray(options) ? options : [];
  const checkedValues = Array.isArray(defaultValue) ? defaultValue : [];
  return (
    <fieldset
      key={JSON.stringify(checkedValues)}
      data-aui="checkboxgroup"
      data-aui-action={actionAttr($action)}
      aria-label={label}
    >
      {safeOptions.map((option, i) =>
        isOption(option) ? (
          <label key={i} data-aui="checkboxgroup-option">
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
            {option.label}
          </label>
        ) : null,
      )}
      {children}
    </fieldset>
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
    }),
    render: ({
      label,
      buttonStyle,
      block,
      submit,
      $action,
      $dispatch,
      children,
    }) => (
      <button
        type={submit ? "submit" : "button"}
        data-aui="button"
        data-aui-style={buttonStyle}
        data-aui-block={block || undefined}
        data-aui-submit={submit || undefined}
        data-aui-action={actionAttr($action)}
        onClick={
          submit
            ? undefined
            : (e) => fire($action, $dispatch, undefined, e.currentTarget)
        }
      >
        {toTextContent(label)}
        {children}
      </button>
    ),
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
    render: ({
      options,
      placeholder,
      label,
      name,
      defaultValue,
      $action,
      $dispatch,
      children,
    }) => {
      const placeholderText = toTextContent(placeholder);
      const initialValue = typeof defaultValue === "string" ? defaultValue : "";
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
          {(Array.isArray(options) ? options : []).map((option, i) =>
            isOption(option) ? (
              <option key={i} value={option.value}>
                {option.label}
              </option>
            ) : null,
          )}
          {children}
        </select>
      );
    },
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
    render: ({
      placeholder,
      multiline,
      label,
      name,
      defaultValue,
      $action,
      $dispatch,
    }) => {
      const submit = (control: HTMLInputElement | HTMLTextAreaElement) =>
        fire($action, $dispatch, control.value, control);
      return multiline ? (
        <textarea
          key={defaultValue}
          data-aui="input"
          data-aui-multiline
          data-aui-action={actionAttr($action)}
          name={name}
          aria-label={label}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onKeyDown={(e) => {
            if (
              e.key !== "Enter" ||
              !(e.ctrlKey || e.metaKey) ||
              e.nativeEvent.isComposing
            )
              return;
            if (e.currentTarget.form) {
              e.preventDefault();
              HTMLFormElement.prototype.requestSubmit.call(
                e.currentTarget.form,
              );
            } else {
              submit(e.currentTarget);
            }
          }}
        />
      ) : (
        <input
          key={defaultValue}
          data-aui="input"
          data-aui-action={actionAttr($action)}
          name={name}
          aria-label={label}
          placeholder={placeholder}
          defaultValue={defaultValue}
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
    },
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
    render: ({ value, min, max, label, name, $action, $dispatch }) => (
      <input
        key={value}
        type="date"
        data-aui="datepicker"
        data-aui-action={actionAttr($action)}
        name={name}
        aria-label={label}
        defaultValue={value}
        min={min}
        max={max}
        onChange={(e) =>
          fire($action, $dispatch, e.currentTarget.value, e.currentTarget)
        }
      />
    ),
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
    }),
    render: ({ label, name, defaultChecked, $action, $dispatch }) => (
      <label data-aui="checkbox">
        <input
          key={String(defaultChecked)}
          type="checkbox"
          data-aui-action={actionAttr($action)}
          name={name}
          defaultChecked={defaultChecked}
          onChange={(e) =>
            fire($action, $dispatch, e.currentTarget.checked, e.currentTarget)
          }
        />
        <span data-aui="checkbox-label">{toTextContent(label)}</span>
      </label>
    ),
  },
  RadioGroup: {
    description:
      "A group of mutually exclusive radio options. Carries `$action` describing the on-change behavior.",
    properties: z.object({
      options: z.array(optionSchema).describe("Selectable options."),
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
      options: z.array(optionSchema).describe("Selectable options."),
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
