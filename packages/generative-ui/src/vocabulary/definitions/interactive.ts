import { z } from "zod";
import { BUTTON_STYLES } from "../../ir";
import type { VocabularyDefinition } from "./types";

const optionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const describedOptionSchema = optionSchema.extend({
  description: z.string().optional(),
});

export const interactiveDefinitions = {
  Button: {
    description:
      "A clickable button. Carries `_action` describing the side effect or resume value. Set `submit` to submit an ancestor Form/Card instead of firing `_action` on click.",
    properties: z.object({
      label: z
        .union([z.string(), z.number()])
        .describe("Button label text or number."),
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
  },
  Select: {
    description:
      "A dropdown selector. Carries `_action` describing the on-select behavior.",
    properties: z.object({
      options: z.array(optionSchema).describe("Selectable options."),
      placeholder: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Placeholder text or number shown when nothing is selected."),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
      name: z.string().optional().describe("Field name used inside a Form."),
      defaultValue: z.string().optional().describe("Initially selected value."),
    }),
  },
  Input: {
    description:
      "A text input. Carries `_action` describing the on-submit behavior.",
    properties: z.object({
      inputType: z
        .enum(["text", "password", "number"])
        .optional()
        .describe("Single-line input type. Values remain strings."),
      placeholder: z.string().optional().describe("Placeholder text."),
      multiline: z
        .boolean()
        .optional()
        .describe(
          'Render a textarea instead of a single-line input; ignored when `inputType` is `"password"` or `"number"`.',
        ),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
      name: z.string().optional().describe("Field name used inside a Form."),
      defaultValue: z.string().optional().describe("Initial text."),
    }),
  },
  DatePicker: {
    description:
      "A date, datetime, or time input. Carries `_action`, which runs once per committed value: a pick from the picker, or a typed value on blur or Enter.",
    properties: z.object({
      inputType: z
        .enum(["date", "datetime", "time"])
        .optional()
        .describe(
          'Temporal input type. Defaults to "date". Values remain strings.',
        ),
      value: z
        .string()
        .optional()
        .describe(
          "Initial value: YYYY-MM-DD for date, HH:mm or HH:mm:ss with optional fraction of at most 9 digits for time, YYYY-MM-DDTHH:mm with optional :ss and fraction of at most 9 digits for datetime. A datetime with Z or ±HH:mm is an instant, displayed in the viewer's time zone and submitted with the same offset and precision. A datetime without an offset is local and submitted unchanged. An empty datetime submits with the viewer's offset and seconds.",
        ),
      min: z
        .string()
        .optional()
        .describe(
          "Minimum value: YYYY-MM-DD for date, HH:mm or HH:mm:ss with optional fraction of at most 9 digits for time, YYYY-MM-DDTHH:mm with optional :ss and fraction of at most 9 digits for datetime. Datetimes with Z or ±HH:mm are converted to the viewer's time zone.",
        ),
      max: z
        .string()
        .optional()
        .describe(
          "Maximum value: YYYY-MM-DD for date, HH:mm or HH:mm:ss with optional fraction of at most 9 digits for time, YYYY-MM-DDTHH:mm with optional :ss and fraction of at most 9 digits for datetime. Datetimes with Z or ±HH:mm are converted to the viewer's time zone.",
        ),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
      name: z.string().optional().describe("Field name used inside a Form."),
    }),
  },
  Checkbox: {
    description:
      "A checkbox with a label. Carries `_action` describing the on-change behavior.",
    properties: z.object({
      label: z
        .union([z.string(), z.number()])
        .describe("Label text or number next to the checkbox."),
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
  },
  Slider: {
    description:
      "A numeric range control. Carries `_action` describing the committed value.",
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
  },
  RadioGroup: {
    description:
      "A group of mutually exclusive radio options. Carries `_action` describing the on-change behavior.",
    properties: z.object({
      options: z.array(describedOptionSchema).describe("Selectable options."),
      name: z.string().optional().describe("Field name used inside a Form."),
      label: z.string().optional().describe("Accessible name for the group."),
      defaultValue: z.string().optional().describe("Initially selected value."),
    }),
  },
  CheckboxGroup: {
    description:
      "A group of checkbox options where any number can be checked. Set `progress` for a checklist the user works through. Carries `_action` describing the on-change behavior.",
    properties: z.object({
      options: z.array(describedOptionSchema).describe("Selectable options."),
      name: z.string().optional().describe("Field name used inside a Form."),
      label: z.string().optional().describe("Accessible name for the group."),
      defaultValue: z
        .array(z.string())
        .optional()
        .describe("Initially checked values."),
      progress: z
        .boolean()
        .optional()
        .describe("Show how many options are checked, with a progress bar."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
