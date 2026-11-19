import { z } from "zod";

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
