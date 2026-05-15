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

## CSS setup

Streamdown ships its control buttons (code-block toolbar, mermaid fullscreen) and the streaming caret as Tailwind utility classes. Tailwind v4 does not scan `node_modules` by default, so add a `@source` directive for Streamdown (and one per installed plugin) to the same stylesheet that imports Tailwind:

```css
@import "tailwindcss";

@source "../node_modules/streamdown/dist/*.js";
@source "../node_modules/@streamdown/code/dist/*.js";
@source "../node_modules/@streamdown/math/dist/*.js";
@source "../node_modules/@streamdown/mermaid/dist/*.js";
@source "../node_modules/@streamdown/cjk/dist/*.js";
```

Adjust the relative path to your project's `node_modules`. In a pnpm or Turbo monorepo with hoisted dependencies, you typically need more `../` segments to reach the workspace root. Only keep the plugin lines for packages you actually installed.

Without these directives, the copy, download, and fullscreen buttons render unstyled, and the `caret` indicator stays invisible.

If you use the `animated` prop or `createAnimatePlugin` for word-level fade-in, also import the keyframes once at your app entry:

```ts
import "streamdown/styles.css";
```

For details on the shadcn/ui design tokens Streamdown expects, see the [Streamdown README](https://github.com/vercel/streamdown#css-custom-properties-design-tokens).

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
