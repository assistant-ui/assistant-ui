# @assistant-ui/react-ink-markdown

Terminal markdown rendering for [`@assistant-ui/react-ink`](https://www.assistant-ui.com/). Wraps [markdansi](https://github.com/steipete/Markdansi) to render formatted headings, code blocks, tables, lists, and more in the terminal.

## Installation

```bash
npm install @assistant-ui/react-ink-markdown
```

For syntax highlighting in code blocks, also install Shiki (optional):

```bash
npm install shiki
```

## Usage

```tsx
import { MarkdownText } from "@assistant-ui/react-ink-markdown";

// Standalone — pass text directly
<MarkdownText text="# Hello **world**" />

// With MessageContent's renderText slot
<MessageContent
  renderText={({ part }) => <MarkdownText text={part.text} />}
/>
```

### With syntax highlighting

```tsx
import { MarkdownText, useShikiHighlighter } from "@assistant-ui/react-ink-markdown";

const App = ({ text }: { text: string }) => {
  const highlighter = useShikiHighlighter({ theme: "github-dark" });
  return <MarkdownText text={text} highlighter={highlighter} />;
};
```

### Auto-wired primitive

Use `MarkdownTextPrimitive` inside `MessagePrimitive.Parts` — it reads text and status from the runtime context automatically:

```tsx
import { MarkdownTextPrimitive } from "@assistant-ui/react-ink-markdown";

<MessagePrimitive.Parts>
  {({ part }) => {
    if (part.type === "text") return <MarkdownTextPrimitive />;
    return null;
  }}
</MessagePrimitive.Parts>
```

## API

See the [assistant-ui docs](https://www.assistant-ui.com/) for full API reference.
