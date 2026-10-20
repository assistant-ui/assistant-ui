# `@assistant-ui/markdown`

> This package is private and not published to npm. Its API can change, and the package can be removed, without notice.

Parse markdown into a framework-neutral document tree.

## Usage

```ts
import { parseMarkdown } from "@assistant-ui/markdown";

const root = parseMarkdown("# Release notes\n\n- [x] Tables\n- [ ] Math");
```

The tree follows CommonMark with the GitHub extensions for tables, strikethrough, task lists, and autolinks. Raw HTML stays in `htmlBlock` and `htmlInline` nodes for a renderer to handle.
