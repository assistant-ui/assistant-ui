# v0.11 Migration: ContentPart to MessagePart

This migration automatically updates your codebase to use the new MessagePart naming convention instead of the deprecated ContentPart naming.

## What this migration does

### 1. Renames all ContentPart types to MessagePart types

**Before:**

```typescript
import {
  TextContentPart,
  ToolCallContentPart,
  ContentPartStatus,
  ThreadUserContentPart,
  ThreadAssistantContentPart
} from "@assistant-ui/react";

function processContent(part: TextContentPart): void {
  console.log(part.text);
}

const MyTool: ToolCallContentPartComponent = ({ toolName }) => {
  return <div>{toolName}</div>;
};
```

**After:**

```typescript
import {
  TextMessagePart,
  ToolCallMessagePart,
  MessagePartStatus,
  ThreadUserMessagePart,
  ThreadAssistantMessagePart
} from "@assistant-ui/react";

function processContent(part: TextMessagePart): void {
  console.log(part.text);
}

const MyTool: ToolCallMessagePartComponent = ({ toolName }) => {
  return <div>{toolName}</div>;
};
```

### 2. Updates MessagePrimitive.Content to MessagePrimitive.Parts

**Before:**

```jsx
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return <MessagePrimitive.Content components={{ Text: MyText }} />;
}
```

**After:**

```jsx
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return <MessagePrimitive.Parts components={{ Text: MyText }} />;
}
```

### 3. Renames ContentPart hooks to MessagePart hooks

**Before:**

```typescript
import {
  useContentPart,
  useContentPartText,
  useContentPartRuntime,
} from "@assistant-ui/react";

function MyComponent() {
  const part = useContentPart();
  const text = useContentPartText();
  const runtime = useContentPartRuntime();
  return null;
}
```

**After:**

```typescript
import {
  useMessagePart,
  useMessagePartText,
  useMessagePartRuntime,
} from "@assistant-ui/react";

function MyComponent() {
  const part = useMessagePart();
  const text = useMessagePartText();
  const runtime = useMessagePartRuntime();
  return null;
}
```

### 4. Updates ContentPartPrimitive to MessagePartPrimitive

**Before:**

```jsx
import { ContentPartPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <div>
      <ContentPartPrimitive.Text />
      <ContentPartPrimitive.Image />
    </div>
  );
}
```

**After:**

```jsx
import { MessagePartPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <div>
      <MessagePartPrimitive.Text />
      <MessagePartPrimitive.Image />
    </div>
  );
}
```

### 5. Renames provider components

**Before:**

```jsx
import { TextContentPartProvider } from "@assistant-ui/react";

function MyComponent() {
  return (
    <TextContentPartProvider text="Hello" isRunning={false}>
      <div>Content</div>
    </TextContentPartProvider>
  );
}
```

**After:**

```jsx
import { TextMessagePartProvider } from "@assistant-ui/react";

function MyComponent() {
  return (
    <TextMessagePartProvider text="Hello" isRunning={false}>
      <div>Content</div>
    </TextMessagePartProvider>
  );
}
```

## Complete type mapping

| Old Name                     | New Name                     |
| ---------------------------- | ---------------------------- |
| `TextContentPart`            | `TextMessagePart`            |
| `ReasoningContentPart`       | `ReasoningMessagePart`       |
| `SourceContentPart`          | `SourceMessagePart`          |
| `ImageContentPart`           | `ImageMessagePart`           |
| `FileContentPart`            | `FileMessagePart`            |
| `Unstable_AudioContentPart`  | `Unstable_AudioMessagePart`  |
| `ToolCallContentPart`        | `ToolCallMessagePart`        |
| `ContentPartStatus`          | `MessagePartStatus`          |
| `ToolCallContentPartStatus`  | `ToolCallMessagePartStatus`  |
| `ThreadUserContentPart`      | `ThreadUserMessagePart`      |
| `ThreadAssistantContentPart` | `ThreadAssistantMessagePart` |
| `ContentPartRuntime`         | `MessagePartRuntime`         |
| `ContentPartState`           | `MessagePartState`           |
| `useContentPart`             | `useMessagePart`             |
| `useContentPartRuntime`      | `useMessagePartRuntime`      |
| `useContentPartText`         | `useMessagePartText`         |
| `useContentPartReasoning`    | `useMessagePartReasoning`    |
| `useContentPartSource`       | `useMessagePartSource`       |
| `useContentPartFile`         | `useMessagePartFile`         |
| `useContentPartImage`        | `useMessagePartImage`        |
| `ContentPartPrimitive`       | `MessagePartPrimitive`       |
| `TextContentPartProvider`    | `TextMessagePartProvider`    |
| `MessagePrimitive.Content`   | `MessagePrimitive.Parts`     |

## How to run this migration

### As part of the full upgrade

```bash
npx @assistant-ui/cli upgrade
```

### Run this specific migration only

```bash
npx @assistant-ui/cli codemod v0-11/content-part-to-message-part <path>
```

Where `<path>` is the path to your source code directory (e.g., `src/` or `.`).

### Options

- `--dry` - Preview changes without applying them
- `--print` - Print the transformed code to stdout
- `--verbose` - Show detailed transformation logs

### Example usage

```bash
# Preview changes without applying them
npx @assistant-ui/cli codemod v0-11/content-part-to-message-part src/ --dry

# Apply the transformation to your src directory
npx @assistant-ui/cli codemod v0-11/content-part-to-message-part src/

# Apply to entire project
npx @assistant-ui/cli codemod v0-11/content-part-to-message-part .
```

## What files are affected?

This migration will process all `.js`, `.jsx`, `.ts`, and `.tsx` files that contain imports from `@assistant-ui/*` packages. It safely ignores:

- Files in `node_modules/`
- Built files in `dist/`, `build/` directories
- Minified files (`*.min.js`, `*.bundle.js`)
- Files that don't import from assistant-ui packages

## Notes

- This migration preserves all functionality - it's purely a naming change
- The old ContentPart APIs are now deprecated and will be removed in a future version
- The migration is safe to run multiple times
- If you have custom code that extends these types, you may need to update your type definitions manually after running the migration
