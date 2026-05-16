# `@assistant-ui/react-hook-form`

[React Hook Form](https://react-hook-form.com) integration for `@assistant-ui/react`. Replace `useForm` with `useAssistantForm` to give the assistant the ability to read and fill your form fields through tool calls.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-hook-form react-hook-form
```

## Usage

```tsx
"use client";

import { useAssistantForm } from "@assistant-ui/react-hook-form";

export function SignupForm() {
  const form = useAssistantForm({
    defaultValues: { firstName: "", lastName: "", email: "" },
    assistant: {
      tools: {
        set_form_field: { render: () => <FieldUpdated /> },
        submit_form: { render: () => <FormSubmitted /> },
      },
    },
  });

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* fields */}</form>;
}
```

The assistant gets two built-in tools: `set_form_field` to write values into fields and `submit_form` to call your submit handler.

## See also

- `@assistant-ui/react-lexical` if you also want a rich-text composer with `@`-mention support inside the same chat.

Full API reference at [assistant-ui.com/docs/api-reference/integrations/react-hook-form](https://www.assistant-ui.com/docs/api-reference/integrations/react-hook-form). See [`examples/with-react-hook-form`](https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-react-hook-form) for a complete app.
