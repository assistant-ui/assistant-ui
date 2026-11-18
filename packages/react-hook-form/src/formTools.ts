import { z } from "zod";

/**
 * A field value the assistant may write. Forms commonly hold numbers and
 * booleans (number inputs, checkboxes, switches), and `setValue` stores the
 * value as given, so a string-only contract leaves those fields with a value
 * their resolver rejects.
 */
const formFieldValue = z.union([z.string(), z.number(), z.boolean()]);

export const formTools = {
  set_form_field: {
    description:
      "Sets a form field. Call this function as soon as the user provides the data for each field.",
    parameters: z.object({
      name: z.string(),
      value: formFieldValue,
    }),
  },
  submit_form: {
    description: "Submits the form. Requests user approval by default.",
    parameters: z.object({}),
  },
  reset_form: {
    description:
      "Resets all form fields to their initial values. Requests user approval by default.",
    parameters: z.object({}),
  },
};
