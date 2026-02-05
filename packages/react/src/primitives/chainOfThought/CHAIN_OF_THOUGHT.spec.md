ChainOfThought Primitive

Overview

- Groups consecutive reasoning and tool-call message parts into a collapsible "chain of thought" section.
- Built on the part-scope mechanism shared with `MessagePrimitiveParts`, using `Derived` for part resolution.
- Each part within the chain of thought gets its own part scope via `ChainOfThoughtPartByIndexProvider`.
- Rendering is delegated to the shared `MessagePartComponent`, supporting the same component configuration as `MessagePrimitiveParts`.

Architecture

ChainOfThoughtState

```typescript
type ChainOfThoughtState = {
  readonly startIndex: number; // index of the first CoT part in the parent message
  readonly parts: readonly ChainOfThoughtPart[];
  readonly collapsed: boolean;
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};
```

ChainOfThoughtMethods

```typescript
type ChainOfThoughtMethods = {
  getState(): ChainOfThoughtState;
  setCollapsed(collapsed: boolean): void;
  part(selector: { index: number }): PartMethods;
};
```

- `part({ index })` delegates to the parent message's `part()` at offset `startIndex + index`.

ChainOfThoughtClient

- Resource params: `{ startIndex, parts, getMessagePart }`.
- `getMessagePart` is a callback that resolves to the parent message's `part()` method.
- The `part` method implementation: `({ index }) => getMessagePart({ index: startIndex + index })`.

Providers

ChainOfThoughtByIndicesProvider

- Wraps a range of message parts (startIndex..endIndex) into a chain of thought scope.
- Reads parts from the parent message state, passes `startIndex` and `getMessagePart` to `ChainOfThoughtClient`.
- Used internally by `MessagePrimitiveParts` when `ChainOfThought` component is configured.

ChainOfThoughtPartByIndexProvider

- Follows the same pattern as `PartByIndexProvider`.
- Reads `startIndex` from chain of thought state.
- Creates a `Derived` part scope: `source: "message"`, `query: { type: "index", index: startIndex + index }`.
- Delegates `get` to `aui.chainOfThought().part({ index })`.

Rendering (ChainOfThoughtPrimitiveParts)

- Accepts `components` prop with the same type as `MessagePrimitiveParts.Props["components"]`.
- Reads `collapsed` and `parts.length` from chain of thought state.
- When collapsed, renders nothing.
- When expanded, renders each part via `ChainOfThoughtPartByIndexProvider` + `MessagePartComponent`.
- `MessagePartComponent` is the shared rendering component exported from `MessageParts.tsx`.

Integration with MessagePrimitiveParts

- When `components.ChainOfThought` is set, `MessagePrimitiveParts` groups consecutive tool-call and reasoning parts into `chainOfThoughtGroup` ranges.
- Each group is wrapped in `ChainOfThoughtByIndicesProvider`, which sets up the chain of thought scope.
- The user's `ChainOfThought` component renders inside that scope and can use `ChainOfThoughtPrimitive.Parts` to render individual parts through the part-scope mechanism.
