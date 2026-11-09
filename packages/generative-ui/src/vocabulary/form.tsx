import type { GenerativeUILibrary } from "../types";
import { formDefinitions } from "./definitions/form";
import { actionAttr, submitForm } from "./dispatch";

export const formVocabulary = {
  Form: {
    ...formDefinitions.Form,
    render: ({ gap, $action, $dispatch, children }) => (
      <form
        data-aui="form"
        data-aui-gap={gap}
        data-aui-action={actionAttr($action)}
        onSubmit={(event) => {
          submitForm($action, $dispatch, event);
        }}
      >
        {children}
      </form>
    ),
  },
} satisfies GenerativeUILibrary;
