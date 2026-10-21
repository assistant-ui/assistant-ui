# `@assistant-ui/markdown`

> This package is private and not published to npm. Its API can change, and the package can be removed, without notice.

Parse markdown into a framework-neutral document tree.

## Usage

```ts
import { parseMarkdown } from "@assistant-ui/markdown";

const root = parseMarkdown("# Release notes\n\n- [x] Tables\n- [ ] Math");
```

The tree follows CommonMark with the GitHub extensions for tables, strikethrough, task lists, and autolinks. Raw HTML stays in `htmlBlock` and `htmlInline` nodes for a renderer to handle.

## URLs and HTML

A link destination or image source must be relative or use a scheme other than `javascript:`, `vbscript:`, `file:`, or `data:`, except a `data:image/` URL in GIF, PNG, JPEG, or WebP. A link or image that fails this check, including one defined by a reference, stays in the tree as its literal text. While a message streams, a link whose destination is unfinished carries no `url`.

Raw HTML is never sanitized or interpreted by the parser. A renderer shows `htmlBlock` and `htmlInline` values as text unless it opts in to rendering HTML, and an opt-in renderer owns sanitizing it.
