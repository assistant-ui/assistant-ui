# `@assistant-ui/react-syntax-highlighter`

Code-block syntax highlighting for `@assistant-ui/react-markdown`, powered by [`react-syntax-highlighter`](https://github.com/react-syntax-highlighter/react-syntax-highlighter). Use the light or async builds to keep your bundle size small.

## When to use this

Pair this with `@assistant-ui/react-markdown` when you want syntax-highlighted code blocks. If you want a batteries-included setup with Shiki built in, use `@assistant-ui/react-streamdown` instead.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-markdown @assistant-ui/react-syntax-highlighter react-syntax-highlighter
```

## Usage

```tsx
import { makeLightSyntaxHighlighter } from "@assistant-ui/react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import js from "react-syntax-highlighter/dist/cjs/languages/hljs/javascript";
import ts from "react-syntax-highlighter/dist/cjs/languages/hljs/typescript";

export const SyntaxHighlighter = makeLightSyntaxHighlighter({
  style: coldarkDark,
  languages: { javascript: js, typescript: ts },
});
```

Pass the resulting component as the `SyntaxHighlighter` override to `MarkdownTextPrimitive`.

## Builds

- `makeLightSyntaxHighlighter` / `makeLightAsyncSyntaxHighlighter`: hljs grammars.
- `makePrismLightSyntaxHighlighter` / `makePrismAsyncLightSyntaxHighlighter`: Prism grammars.

Full reference at [assistant-ui.com/docs/ui/syntax-highlighting](https://www.assistant-ui.com/docs/ui/syntax-highlighting).
