import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { actionAttr, fire } from "./dispatch";
import { collectFormValuesFromEvent } from "./collectFormValues";

export const formVocabulary = {
  Form: {
    description:
      "Wraps named child controls (Select/Input/Checkbox/RadioGroup/DatePicker with a `name`). Carries `$action`; on submit it fires with every named control's value, keyed by `name`.",
    properties: z.object({
      gap: z
        .number()
        .min(0)
        .max(8)
        .optional()
        .describe(
          "Gap between children in 4px units. 0 to 8 is the supported range.",
        ),
    }),
    render: ({ gap, $action, $dispatch, children }) => (
      <form
        data-aui="form"
        data-aui-gap={gap}
        data-aui-action={actionAttr($action)}
        onSubmit={(event) => {
          event.preventDefault();
          fire($action, $dispatch, collectFormValuesFromEvent(event));
        }}
      >
        {children}
      </form>
    ),
  },
} satisfies GenerativeUILibrary;
