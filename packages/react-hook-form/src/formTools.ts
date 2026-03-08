import { z } from "zod";

export const formTools = {
  set_form_field: {
    description:
      "Sets a form field. Call this function as soon as the user provides the data for each field.",
    parameters: z.object({
      name: z.string(),
      value: z.string(),
    }),
  },
  submit_form: {
    description: "Submits the form. Confirm with user before submitting.",
    parameters: z.object({}),
  },
  reset_form: {
    description:
      "Resets all form fields to their initial values. Confirm with user before resetting.",
    parameters: z.object({}),
  },
};
