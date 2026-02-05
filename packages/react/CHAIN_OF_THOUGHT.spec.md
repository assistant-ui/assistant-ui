# Chain of Thought Implementation Spec

## Overview
Add a new `chainOfThought` client scope for rendering reasoning and tool-call parts in an accordion UI pattern.

## Client Scope

### 1. Type Registration (`types/scopes/chainOfThought.ts`)

```typescript
export type ChainOfThoughtPart = ToolCallPart | ReasoningPart;

export type ChainOfThoughtState = {
  readonly parts: readonly ChainOfThoughtPart[];
  readonly collapsed: boolean;
  readonly status: MessagePartStatus; // status of the last part
};

export type ChainOfThoughtMethods = {
  getState(): ChainOfThoughtState;
  setCollapsed(collapsed: boolean): void;
};

export type ChainOfThoughtMeta = {
  source: "message";
  query: { type: "chainOfThought" };
};

export type ChainOfThoughtClientSchema = {
  state: ChainOfThoughtState;
  methods: ChainOfThoughtMethods;
  meta: ChainOfThoughtMeta;
};
```

Register in `types/store-augmentation.ts`:
```typescript
chainOfThought: ChainOfThoughtClientSchema;
```

### 2. Client Implementation (`client/ChainOfThoughtClient.ts`)

```typescript
export const ChainOfThoughtClient = resource(({
  parts
}: {
  parts: readonly ChainOfThoughtPart[];
}): ClientOutput<"chainOfThought"> => {
  const [collapsed, setCollapsed] = tapState(true);

  const status = tapMemo<MessagePartStatus>(() => {
    const lastPart = parts[parts.length - 1];
    return lastPart?.status ?? { type: "complete" };
  }, [parts]);

  const state = tapMemo<ChainOfThoughtState>(
    () => ({ parts, collapsed, status }),
    [parts, collapsed, status]
  );

  return {
    state,
    methods: {
      getState: () => state,
      setCollapsed,
    },
  };
});
```

### 3. Context Providers (`context/providers/ChainOfThoughtProvider.tsx`)

**ChainOfThoughtByIndicesProvider**: Extracts parts from message by index range and sets up chainOfThought client.

```typescript
export const ChainOfThoughtByIndicesProvider = ({
  startIndex,
  endIndex,
  children
}: {
  startIndex: number;
  endIndex: number;
  children: ReactNode;
}) => {
  const parts = useAuiState(({ message }) =>
    message.parts.slice(startIndex, endIndex + 1) as ChainOfThoughtPart[]
  );

  const aui = useAui({
    chainOfThought: ChainOfThoughtClient({ parts })
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
```

## Primitives

### 1. ChainOfThoughtPrimitive.Root

Container component. Sets up the chainOfThought client provider.

### 2. ChainOfThoughtPrimitive.AccordionTrigger

Button that toggles `collapsed` state via `aui.chainOfThought().setCollapsed(!collapsed)`.

### 3. ChainOfThoughtPrimitive.Parts

```typescript
namespace ChainOfThoughtPrimitiveParts {
  export type Props = {
    components?: {
      Reasoning?: ReasoningMessagePartComponent;
      ToolFallback?: ToolCallMessagePartComponent;
    };
  };
}
```

**Behavior:**
- Reads `collapsed` and `parts` from chainOfThought state
- When collapsed, shows no parts
- When expanded, shows all parts
- Renders each part using provided `Reasoning` or `ToolFallback` component

## MessagePrimitive.Parts Integration

Update `MessagePrimitiveParts.Props`:

```typescript
components?: {
  // existing fields...
  ChainOfThought?: ComponentType;
}
```

**Logic:**

**Mutual Exclusivity:** When `ChainOfThought` is provided, the following components are **completely ignored**:
- `Reasoning`
- `tools` (both `by_name` and `Fallback`)
- `ReasoningGroup`
- `ToolGroup`

**Extraction & Rendering:**
1. Identify consecutive reasoning/tool-call parts in the message
2. For each group found:
   - Calculate `startIndex` and `endIndex` of the group
   - Wrap in `<ChainOfThoughtByIndicesProvider startIndex={...} endIndex={...}>` internally
   - Render `<ChainOfThought />` inside the provider (no props passed to component)
3. Non-reasoning/tool parts render normally (Text, Image, File, etc.)

**Implementation in `groupMessageParts()`:**
- When `ChainOfThought` is provided, create `chainOfThoughtGroup` ranges instead of separate `toolGroup` and `reasoningGroup` ranges
- A chainOfThoughtGroup includes both consecutive tool-call AND reasoning parts together

## File Structure

```
packages/react/src/
├── types/scopes/chainOfThought.ts
├── client/ChainOfThoughtClient.ts
├── context/providers/ChainOfThoughtByIndicesProvider.tsx
└── primitives/chainOfThought/
    ├── index.ts
    ├── ChainOfThoughtRoot.tsx
    ├── ChainOfThoughtAccordionTrigger.tsx
    └── ChainOfThoughtParts.tsx
```

## Implementation Notes

- Default `collapsed: true` in client
- `collapsed` state managed by `tapState` in client
- `status` derived from last part's status in client
- Follow existing primitive patterns (see MessageParts, PartByIndex)
- `ChainOfThoughtByIndicesProvider` extracts parts from message by index range
- ChainOfThoughtPrimitive.Accordion will be added later - not in scope
- When `ChainOfThought` is provided to MessagePrimitive.Parts, reasoning and tool parts are **never** rendered through normal flow
