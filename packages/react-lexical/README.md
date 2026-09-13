# `@assistant-ui/react-lexical`

[Lexical](https://lexical.dev) rich-text composer for `@assistant-ui/react`, with first-class support for `@`-mention directive chips. Drop `LexicalComposerInput` in place of the default plain-text composer to render mentions and slash commands as inline chips while keeping the underlying message format clean.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-lexical
```

## Usage

```tsx
import { ComposerPrimitive } from "@assistant-ui/react";
import { LexicalComposerInput } from "@assistant-ui/react-lexical";

export function Composer() {
  return (
    <ComposerPrimitive.Root>
      <LexicalComposerInput aria-label="Message" placeholder="Ask anything..." />
      <ComposerPrimitive.Send />
    </ComposerPrimitive.Root>
  );
}
```

Use `aria-label` or `aria-labelledby` to name the editable textbox, and `aria-describedby` to reference hint or error text. Other HTML props and the forwarded ref apply to the outer wrapper.

For custom chip rendering, pass a `directiveChip` render prop. Directives (e.g. `@user`, `/command`) survive cursor navigation, selection, and copy/paste as a single unit.

Pass custom Lexical plugin components as `children` to hook into the editor via `useLexicalComposerContext`, for concerns like paste normalization or length limits.

## See also

- `@assistant-ui/react-hook-form` for binding the composer to a form whose fields the assistant can read and fill.

Full reference at [assistant-ui.com/docs](https://www.assistant-ui.com/docs).
