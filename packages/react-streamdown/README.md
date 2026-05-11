# `@assistant-ui/react-streamdown`

[Streamdown](https://github.com/vercel/streamdown)-based markdown rendering for `@assistant-ui/react`. Drop-in replacement for `@assistant-ui/react-markdown` with built-in Shiki, KaTeX, and Mermaid support, optimized for AI streaming output.

## When to use this

| Package                                  | Best for                                                          |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `@assistant-ui/react-markdown`           | Lightweight rendering; bring your own syntax highlighter.         |
| `@assistant-ui/react-streamdown`         | Feature-rich with built-in Shiki, KaTeX, and Mermaid.             |
| `@assistant-ui/react-syntax-highlighter` | Pair with `react-markdown` when you only need code-block highlighting. |

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-streamdown
```

For optional features:

```bash
npm install @streamdown/code @streamdown/math @streamdown/mermaid @streamdown/cjk
```

## Usage

```tsx
import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import "katex/dist/katex.min.css";

export const MarkdownText = () => (
  <StreamdownTextPrimitive
    plugins={{ code, math, mermaid }}
    shikiTheme={["github-light", "github-dark"]}
  />
);
```

Full prop reference, plugin docs, performance guide, and `react-markdown` migration notes at [assistant-ui.com/docs/ui/streamdown](https://www.assistant-ui.com/docs/ui/streamdown).
