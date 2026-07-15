import { useId } from "react";
import { z } from "zod";
import type { Action } from "../ir";
import { BUTTON_STYLES } from "../ir";
import type { GenerativeUIDispatch, GenerativeUILibrary } from "../types";
import { actionAttr, fire } from "./dispatch";

const optionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

type RadioGroupRenderProps = {
  options: { label: string; value: string }[];
  name?: string;
  label?: string;
  defaultValue?: string;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function RadioGroupRender({
  options,
  name,
  label,
  defaultValue,
  $action,
  $dispatch,
}: RadioGroupRenderProps) {
  const generatedName = useId();
  const fieldName = name ?? generatedName;
  const safeOptions = Array.isArray(options) ? options : [];
  return (
    <fieldset
      data-aui="radiogroup"
      data-aui-action={actionAttr($action)}
      aria-label={label}
    >
      {safeOptions.map((option, i) =>
        option &&
        typeof option.label === "string" &&
        typeof option.value === "string" ? (
          <label key={i} data-aui="radiogroup-option">
            <input
              type="radio"
              name={fieldName}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              onChange={() => fire($action, $dispatch, option.value)}
            />
            {option.label}
          </label>
        ) : null,
      )}
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
        onClick={submit ? undefined : () => fire($action, $dispatch)}
      >
        {label}
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
    }),
    render: ({
      options,
      placeholder,
      label,
      name,
      $action,
      $dispatch,
      children,
    }) => (
      <select
        data-aui="select"
        data-aui-action={actionAttr($action)}
        name={name}
        aria-label={label}
        defaultValue=""
        onChange={(e) => fire($action, $dispatch, e.currentTarget.value)}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o: { label: string; value: string }, i: number) => (
          <option key={i} value={o.value}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
    ),
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
    }),
    render: ({ placeholder, multiline, label, name, $action, $dispatch }) => {
      const submit = (v: string) => fire($action, $dispatch, v);
      return multiline ? (
        <textarea
          data-aui="input"
          data-aui-multiline
          data-aui-action={actionAttr($action)}
          name={name}
          aria-label={label}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (
              e.key !== "Enter" ||
              !(e.ctrlKey || e.metaKey) ||
              e.nativeEvent.isComposing
            )
              return;
            if (e.currentTarget.form) {
              e.preventDefault();
              e.currentTarget.form.requestSubmit();
            } else {
              submit(e.currentTarget.value);
            }
          }}
        />
      ) : (
        <input
          data-aui="input"
          data-aui-action={actionAttr($action)}
          name={name}
          aria-label={label}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.nativeEvent.isComposing &&
              !e.currentTarget.form
            )
              submit(e.currentTarget.value);
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
        type="date"
        data-aui="datepicker"
        data-aui-action={actionAttr($action)}
        name={name}
        aria-label={label}
        defaultValue={value}
        min={min}
        max={max}
        onChange={(e) => fire($action, $dispatch, e.currentTarget.value)}
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
          type="checkbox"
          data-aui-action={actionAttr($action)}
          name={name}
          defaultChecked={defaultChecked}
          onChange={(e) => fire($action, $dispatch, e.currentTarget.checked)}
        />
        <span data-aui="checkbox-label">{label}</span>
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
} satisfies GenerativeUILibrary;
