import { z } from "zod";
import type { GenerativeUILibrary } from "../types";

const optionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const interactiveVocabulary = {
  Button: {
    description:
      "A clickable button. Carries `$action` describing the side effect or resume value.",
    properties: z.object({
      label: z.string().describe("Button label."),
      buttonStyle: z
        .enum(["primary", "secondary", "outline", "ghost", "danger"])
        .optional()
        .describe("Visual style."),
      block: z
        .boolean()
        .optional()
        .describe("Whether the button spans the full width."),
    }),
    render: ({ label, buttonStyle, block, $action, children }) => (
      <button
        data-aui="button"
        data-aui-style={buttonStyle}
        data-aui-block={block}
        data-aui-action={$action ? JSON.stringify($action) : undefined}
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
    }),
    render: ({ options, placeholder, $action, children }) => (
      <select
        data-aui="select"
        data-aui-action={$action ? JSON.stringify($action) : undefined}
        defaultValue=""
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o: { label: string; value: string }) => (
          <option key={o.value} value={o.value}>
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
    }),
    render: ({ placeholder, multiline, $action }) =>
      multiline ? (
        <textarea
          data-aui="input"
          data-aui-multiline
          data-aui-action={$action ? JSON.stringify($action) : undefined}
          placeholder={placeholder}
        />
      ) : (
        <input
          data-aui="input"
          data-aui-action={$action ? JSON.stringify($action) : undefined}
          placeholder={placeholder}
        />
      ),
  },
  DatePicker: {
    description:
      "A date input. Carries `$action` describing the on-select behavior.",
    properties: z.object({
      value: z.string().optional().describe("Initial date (YYYY-MM-DD)."),
      min: z.string().optional().describe("Minimum date (YYYY-MM-DD)."),
      max: z.string().optional().describe("Maximum date (YYYY-MM-DD)."),
    }),
    render: ({ value, min, max, $action }) => (
      <input
        type="date"
        data-aui="datepicker"
        data-aui-action={$action ? JSON.stringify($action) : undefined}
        defaultValue={value}
        min={min}
        max={max}
      />
    ),
  },
} satisfies GenerativeUILibrary;
