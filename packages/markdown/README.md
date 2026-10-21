# `@assistant-ui/markdown`

> This package is private and not published to npm. Its API can change, and the package can be removed, without notice.

Parse markdown into a framework-neutral document tree.

## Usage

```ts
import { parseMarkdown } from "@assistant-ui/markdown";

const root = parseMarkdown("# Release notes\n\n- [x] Tables\n- [ ] Math");
```

The tree follows CommonMark with the GitHub extensions for tables, strikethrough, task lists, and autolinks. Raw HTML stays in `htmlBlock` and `htmlInline` nodes for a renderer to handle.

## React

```tsx
import { Markdown } from "@assistant-ui/markdown/react";

<Markdown text={text} final={status !== "running"} />;
```

`Markdown` renders the tree as HTML elements with no wrapper. While a message streams, a block whose source is unchanged keeps its object, so only the blocks that changed render again. Pass `final` once the message is complete, so syntax left open at its end is no longer closed provisionally.

`components` replaces how a node type renders. Each component receives the `node` and, for a node with children, its rendered `children`; a table's component receives its rendered head and body.

```tsx
<Markdown
  text={text}
  components={{
    table: ({ children }) => (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    ),
  }}
/>
```

Math renders as its TeX source in `code` elements with the `language-math` class and `math-inline` or `math-display`.

## Vue

```vue
<script setup lang="ts">
import { Markdown } from "@assistant-ui/markdown/vue";
</script>

<template>
  <Markdown :text="text" :final="status !== 'running'" />
</template>
```

`Markdown` renders the same HTML elements as the React renderer, with no wrapper, and keeps settled blocks from rendering again while a message streams. Pass `final` once the message is complete. `components` replaces how a node type renders; each Vue component receives the `node` prop and its rendered children in the default slot, including a table's rendered head and body.

## React Native

```tsx
import { Markdown } from "@assistant-ui/markdown/react-native";

<Markdown text={text} final={status !== "running"} />;
```

`Markdown` renders native `View`, `Text`, and `Image` elements with vertical spacing between blocks. It accepts the same `text`, `final`, and `components` props as the React renderer and keeps settled blocks from rendering again while streaming. Links open through `Linking.openURL`; code and math render as monospace source, and raw HTML renders as plain text. Override node components to customize styling, including text colors.

## URLs and HTML

A link destination or image source must be relative or use a scheme other than `javascript:`, `vbscript:`, `file:`, or `data:`, except a `data:image/` URL in GIF, PNG, JPEG, or WebP. A link or image that fails this check, including one defined by a reference, stays in the tree as its literal text. While a message streams, a link whose destination is unfinished carries no `url`.

Raw HTML is never sanitized or interpreted by the parser. A renderer shows `htmlBlock` and `htmlInline` values as text unless it opts in to rendering HTML, and an opt-in renderer owns sanitizing it.
