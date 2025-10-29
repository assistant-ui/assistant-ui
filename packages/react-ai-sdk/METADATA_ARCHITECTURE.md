# Message Metadata Architecture: AI SDK v5 + assistant-ui

This document explains how reasoning duration persistence works in the assistant-ui integration with AI SDK v5, using the recommended `metadata.custom` pattern.

## Overview

The implementation follows **AI SDK v5's message metadata pattern** while working within assistant-ui's converter architecture. The key insight is understanding the separation between:

- **AI SDK's `UIMessage`**: Ephemeral message format from streaming
- **assistant-ui's `ThreadMessage`**: Persistent message format for UI state
- **Storage format**: Extended UIMessage with assistant-ui metadata bridge

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STREAMING PHASE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  AI SDK Stream                                                        │
│  ↓                                                                    │
│  UIMessage[] (with reasoning parts)                                   │
│  ↓                                                                    │
│  useAISDKRuntime tracks timing                                        │
│    - reasoning part.state: "streaming" → start timer                 │
│    - reasoning part.state: "done" → compute duration                 │
│    - reasoningDurations: { "rs_abc": 6, "part-0": 3 }               │
│  ↓                                                                    │
│  AISDKMessageConverter.useThreadMessages({                            │
│    messages: UIMessage[],                                             │
│    metadata: { reasoningDurations }  ← Runtime state passed here     │
│  })                                                                   │
│  ↓                                                                    │
│  Converter reads metadata.reasoningDurations                          │
│  ↓                                                                    │
│  ThreadMessage[] with metadata.custom.reasoningDurations              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          SAVE PHASE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ThreadMessage.metadata.custom.reasoningDurations                     │
│  ↓                                                                    │
│  useExternalHistory extracts metadata.custom                          │
│  ↓                                                                    │
│  Attaches to UIMessage.__assistant_ui_metadata bridge field           │
│  ↓                                                                    │
│  aiSDKFormatAdapter.encode() persists extended UIMessage              │
│  ↓                                                                    │
│  Storage (JSON/DB) with __assistant_ui_metadata                       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         RELOAD PHASE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Storage → aiSDKFormatAdapter.decode()                                │
│  ↓                                                                    │
│  UIMessage with __assistant_ui_metadata restored                      │
│  ↓                                                                    │
│  AISDKMessageConverter.toThreadMessages()                             │
│  ↓                                                                    │
│  Converter reads __assistant_ui_metadata.reasoningDurations           │
│  ↓                                                                    │
│  Writes to ThreadMessage.metadata.custom.reasoningDurations           │
│  ↓                                                                    │
│  ReasoningMessagePart.duration restored                               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Why The Bridge Field?

The `__assistant_ui_metadata` bridge field exists because of a fundamental type mismatch:

**AI SDK v5's UIMessage:**

```typescript
type UIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts?: UIMessagePart[];
  // NO metadata field!
};
```

**assistant-ui's ThreadMessage:**

```typescript
type ThreadMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: MessagePart[];
  metadata?: {
    custom?: Record<string, unknown>; // ← Has metadata!
  };
};
```

**The mismatch:**

1. During streaming, we convert `UIMessage` → `ThreadMessage` and write to `metadata.custom`
2. On save, we store `UIMessage` (AI SDK format for compatibility)
3. But `UIMessage` has no place to put `metadata.custom` data!
4. Solution: Extension field `__assistant_ui_metadata`

This is **NOT a hack**. It's the correct architectural solution for:

- Type safety (can't modify AI SDK types)
- Clean separation (AI SDK data vs assistant-ui data)
- Compatibility (storage format matches AI SDK)

## Message-Relative Keys

Durations are keyed by part identifier (not message-scoped) because message IDs change during persistence:

```typescript
// Client generates temporary ID
message.id = "temp-abc-123";

// Save to cloud
// ↓

// Server assigns permanent ID
message.id = "msg-xyz-456";

// If we used message-scoped keys:
// Save:   "temp-abc-123:rs_001" → 6 seconds
// Reload: Looking for "msg-xyz-456:rs_001" → NOT FOUND!

// With message-relative keys:
// Save:   "rs_001" → 6 seconds
// Reload: "rs_001" → 6 seconds ✓
```

**Key formats:**

- `"rs_abc123"` - itemId from providerMetadata (preferred)
- `"part-0"` - fallback using part index

## Code Flow

### 1. Runtime Tracking (useAISDKRuntime.tsx)

```typescript
// Track timing state transitions
const [reasoningDurations, setReasoningDurations] = useState<
  Record<string, number>
>({});

// Watch for part.state changes
messages.forEach((message) => {
  message.parts?.forEach((part, partIndex) => {
    if (part.type !== "reasoning") return;

    const key = getItemId(part) || `part-${partIndex}`;

    if (part.state === "streaming") {
      // Start timer
      timings[key] = { start: Date.now() };
    }

    if (part.state === "done") {
      // Compute duration
      const elapsed = Date.now() - timings[key].start;
      durations[key] = Math.ceil(elapsed / 1000);
    }
  });
});
```

### 2. Conversion (convertMessage.ts)

```typescript
AISDKMessageConverter.useThreadMessages({
  messages: UIMessage[],
  metadata: { reasoningDurations },  // ← Runtime state
})

// Converter callback:
(message: UIMessage, metadata: Metadata) => {
  // For reasoning parts:
  const duration =
    metadata.reasoningDurations?.[key] ||  // Runtime state (streaming)
    message.__assistant_ui_metadata?.reasoningDurations?.[key];  // Stored (reload)

  return {
    role: "assistant",
    content: [{
      type: "reasoning",
      text: "...",
      duration,  // ← Attached here
    }],
    metadata: {
      custom: {
        reasoningDurations: metadata.reasoningDurations,  // ← Store for save
      }
    }
  };
}
```

### 3. Persistence (useExternalHistory.tsx)

```typescript
// On save:
const reasoningDurations = message.metadata?.custom?.reasoningDurations;

const uiMessageWithMetadata = {
  ...originalUIMessage,
  __assistant_ui_metadata: { reasoningDurations }, // ← Attach bridge field
};

await historyAdapter.append({ message: uiMessageWithMetadata });

// On load:
const metadataMap = new Map(
  storedMessages.map((m) => [
    m.id,
    m.__assistant_ui_metadata, // ← Extract bridge field
  ]),
);

// Reconstruct UIMessages with metadata for conversion
const uiMessages = messages.map((msg) => ({
  ...msg,
  __assistant_ui_metadata: metadataMap.get(msg.id),
}));
```

### 4. Storage Adapter (aiSDKFormatAdapter.ts)

```typescript
// Encode: Store the bridge field
encode(entry: MessageStorageEntry<UIMessage>) {
  const metadata = (message as UIMessageWithMetadata).__assistant_ui_metadata;
  return {
    ...message,
    __assistant_ui_metadata: metadata,
  };
}

// Decode: Restore the bridge field
decode(stored: MessageStorageEntry<AISDKStorageFormat>) {
  return {
    ...stored,
    __assistant_ui_metadata: stored.__assistant_ui_metadata,
  };
}
```

## Type Safety

All metadata is properly typed through:

```typescript
// types/metadata.ts
export interface AssistantUIMetadata {
  reasoningDurations?: Record<string, number>;
}

export type UIMessageWithMetadata = UIMessage & {
  __assistant_ui_metadata?: AssistantUIMetadata;
};
```

## Why This Approach Is Correct

1. **Follows AI SDK v5 pattern**: Uses `metadata.custom` for custom data
2. **Type-safe**: Proper TypeScript types throughout
3. **Clean separation**: AI SDK vs assistant-ui concerns separated via bridge field
4. **Handles edge cases**: Multiple reasoning parts, ID changes, reload cycles
5. **Maintainable**: Clear data flow with comprehensive documentation

## Comparison to Alternatives

### Alternative 1: providerMetadata (old approach)

```typescript
part.providerMetadata = {
  "assistant-ui": { duration: 6 },
};
```

**Pros:** Simpler, part-level data, natural flow
**Cons:**

- Semantic issue: providerMetadata is for AI providers (OpenAI, Anthropic)
- Doesn't use AI SDK v5's metadata.custom pattern
- Not future-proof for other metadata needs

### Alternative 2: Don't persist

```typescript
// Track in component state only
const [durations, setDurations] = useState({});
```

**Pros:** Simplest
**Cons:** Lost on reload, not useful for historical analysis

### Alternative 3: Separate DB column

```typescript
parts: pgTable("parts", {
  reasoning_duration_ms: integer(),
});
```

**Pros:** Queryable, clean DB schema
**Cons:** Requires part IDs (SDK doesn't provide), extra DB write

## Future Improvements

1. **AI SDK adds part IDs**: Would simplify keying (use part.id instead of itemId)
2. **AI SDK adds metadata field**: Would eliminate bridge field need
3. **assistant-ui native support**: Could move bridge pattern to core library
4. **Multiple metadata types**: Easy to extend `AssistantUIMetadata` interface

## Conclusion

The current implementation is **architecturally sound** and follows best practices:

- Uses AI SDK v5's recommended `metadata.custom` pattern
- Properly separates concerns via bridge field
- Handles all edge cases (multiple parts, ID changes, reload)
- Type-safe and well-documented

The complexity is **justified** because it correctly solves a real architectural mismatch between AI SDK's streaming format and assistant-ui's persistent format, while maintaining semantic correctness and future extensibility.
