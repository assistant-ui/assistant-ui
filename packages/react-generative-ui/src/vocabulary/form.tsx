import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { actionAttr, fire } from "./dispatch";
import {
  collectFormValues,
  type FormControlElementLike,
} from "./collectFormValues";

export const formVocabulary = {
  Form: {
    description:
      "Wraps named child controls (Select/Input/Checkbox/RadioGroup/DatePicker with a `name`). Carries `$action`; on submit it fires with every named control's value, keyed by `name`.",
    properties: z.object({
      gap: z.number().optional().describe("Gap between children in 4px units."),
    }),
    render: ({ gap, $action, $dispatch, children }) => (
      <form
        data-aui="form"
        data-aui-gap={gap}
        data-aui-action={actionAttr($action)}
        onSubmit={(event) => {
          event.preventDefault();
          fire(
            $action,
            $dispatch,
            collectFormValues(
              event.currentTarget
                .elements as unknown as ArrayLike<FormControlElementLike>,
            ),
          );
        }}
      >
        {children}
      </form>
    ),
  },
} satisfies GenerativeUILibrary;
