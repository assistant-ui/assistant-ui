# @assistant-ui/react-streamdown

Streamdown-based markdown rendering for assistant-ui. An alternative to `@assistant-ui/react-markdown` with built-in syntax highlighting, math, and diagram support.

## When to Use

| Package | Best For |
|---------|----------|
| `@assistant-ui/react-markdown` | Lightweight, bring-your-own syntax highlighter |
| `@assistant-ui/react-streamdown` | Feature-rich with built-in Shiki, KaTeX, Mermaid |

## Installation

```bash
npm install @assistant-ui/react-streamdown streamdown
```

For additional features, install the optional plugins:

```bash
npm install @streamdown/code @streamdown/math @streamdown/mermaid @streamdown/cjk
```

## Usage

### Basic

```tsx
import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";

// Inside a MessagePartText component
<StreamdownTextPrimitive />
```

### With Plugins (Recommended)

```tsx
import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import "katex/dist/katex.min.css";

<StreamdownTextPrimitive
  plugins={{ code, math, mermaid }}
  shikiTheme={["github-light", "github-dark"]}
/>
```

### Migration from react-markdown

If you're migrating from `@assistant-ui/react-markdown`, you can use the compatibility API:

```tsx
import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";

// Your existing SyntaxHighlighter component still works
<StreamdownTextPrimitive
  components={{
    SyntaxHighlighter: MySyntaxHighlighter,
    CodeHeader: MyCodeHeader,
  }}
  componentsByLanguage={{
    mermaid: { SyntaxHighlighter: MermaidRenderer }
  }}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `mode` | `"streaming" \| "static"` | Rendering mode. Default: `"streaming"` |
| `plugins` | `PluginConfig` | Streamdown plugins (code, math, mermaid, cjk) |
| `shikiTheme` | `[string, string]` | Light and dark theme for Shiki |
| `components` | `object` | Custom components including `SyntaxHighlighter` and `CodeHeader` |
| `componentsByLanguage` | `object` | Language-specific component overrides |
| `preprocess` | `(text: string) => string` | Text preprocessing function |
| `controls` | `boolean \| object` | Enable/disable UI controls for code blocks and tables |
| `containerProps` | `object` | Props for the container div |
| `containerClassName` | `string` | Class name for the container |
| `remarkRehypeOptions` | `object` | Options passed to remark-rehype during processing |
| `BlockComponent` | `React.ComponentType` | Custom component for rendering blocks |
| `parseMarkdownIntoBlocksFn` | `(md: string) => string[]` | Custom block parsing function |
| `remend` | `object` | Incomplete markdown auto-completion config |
| `linkSafety` | `object` | Link safety confirmation config |
| `mermaid` | `object` | Mermaid diagram rendering config |
| `allowedTags` | `object` | HTML tags whitelist |

## Differences from react-markdown

1. **Streaming optimization**: Uses block-based rendering and `remend` for better streaming performance
2. **Built-in highlighting**: Shiki is integrated via `@streamdown/code` plugin
3. **No smooth prop**: Streaming animation is handled by streamdown's `mode` and `isAnimating`
4. **Auto isAnimating**: Automatically detects streaming state from message context

## Advanced Usage

### Custom Block Rendering

Use `BlockComponent` to customize how individual markdown blocks are rendered:

```tsx
<StreamdownTextPrimitive
  BlockComponent={({ content, index }) => (
    <div key={index} className="my-block">
      {/* Custom block rendering */}
    </div>
  )}
/>
```

### Custom Block Parsing

Override the default block splitting logic:

```tsx
<StreamdownTextPrimitive
  parseMarkdownIntoBlocksFn={(markdown) => markdown.split(/\n{2,}/)}
/>
```

### Using Hooks

```tsx
import {
  useIsStreamdownCodeBlock,
  useStreamdownPreProps,
} from "@assistant-ui/react-streamdown";

// Inside a code component
function MyCodeComponent() {
  const isCodeBlock = useIsStreamdownCodeBlock();
  const preProps = useStreamdownPreProps();

  if (!isCodeBlock) {
    return <code className="inline-code">...</code>;
  }

  return <pre {...preProps}>...</pre>;
}
```

## Performance Best Practices

1. **Use memoized components**: Custom `SyntaxHighlighter` and `CodeHeader` components should be memoized to avoid unnecessary re-renders.

2. **Avoid inline function props**: Define `preprocess`, `parseMarkdownIntoBlocksFn`, and other callbacks outside the render function or wrap them in `useCallback`.

3. **Plugin configuration**: Pass plugin objects by reference (not inline) to prevent recreation on each render.

```tsx
// Good
const plugins = useMemo(() => ({ code, math }), []);
<StreamdownTextPrimitive plugins={plugins} />

// Avoid
<StreamdownTextPrimitive plugins={{ code, math }} />
```

## License

MIT
