# `@assistant-ui/react-ink-markdown`

Terminal markdown rendering for [`@assistant-ui/react-ink`](https://www.npmjs.com/package/@assistant-ui/react-ink). Wraps [`markdansi`](https://github.com/steipete/Markdansi) to render formatted headings, code blocks, tables, lists, and more in the terminal, with Shiki syntax highlighting.

## Installation

```bash
npm install @assistant-ui/react-ink @assistant-ui/react-ink-markdown ink react shiki
```

## Usage

Inside `MessagePrimitive.Parts`, use `MarkdownTextPrimitive` to read text and status from the runtime context automatically:

```tsx
import { MessagePrimitive } from "@assistant-ui/react-ink";
import { MarkdownTextPrimitive } from "@assistant-ui/react-ink-markdown";

<MessagePrimitive.Parts>
  {({ part }) => (part.type === "text" ? <MarkdownTextPrimitive /> : null)}
</MessagePrimitive.Parts>;
```

For standalone use or to attach a custom Shiki highlighter, see the Documentation section below.

## Documentation

Full reference at [assistant-ui.com/docs/ink](https://www.assistant-ui.com/docs/ink).
