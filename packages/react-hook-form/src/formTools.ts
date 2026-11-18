import { z } from "zod";

/** The primitive values the assistant may write; nested objects and arrays are out of scope. */
const formFieldValue = z.union([z.string(), z.number(), z.boolean()]);

export const formTools = {
  set_form_field: {
    description:
      "Sets a form field. Call this function as soon as the user provides the data for each field. The value takes the type the field already holds, so a number or boolean is written as a string into a field that holds a string.",
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
