# Reasoning Duration Architecture

## Overview

The reasoning duration feature determines how long an assistant message spent “thinking” and ensures that the value persists across sessions. The implementation has evolved through several iterations; this document summarizes the current design, the lessons learned, and the remaining gaps relative to product requirements.

## Historical Attempts

1. **Initial state + converter approach**
   - Runtime (`useAISDKRuntime.tsx`) tracked per-part start/end timestamps in local state.
   - `convertMessage.ts` computed the duration from those timestamps and mutated `providerMetadata` before persistence.
   - Worked for display and persistence but placed business logic inside the converter and mutated objects during conversion.

2. **Hook-based refactor**
   - Introduced `useReasoningDuration` hook that updated `providerMetadata` every second via `setMessages`.
   - Converter became read-only, fulfilling the original architectural goals.
   - In practice the AI SDK overwrote custom metadata with each streamed part, leading to infinite loops and broken persistence.
   - Conclusion: mutating metadata during streaming is unreliable because the SDK recreates message objects for every token.

3. **Hybrid fixes**
   - Restored runtime state tracking and converter mutation to regain persistence.
   - Disabled the hook but kept the converter doing the heavy lifting, leaving the design only partially aligned with requirements.

## Current Architecture (October 2025)

```
AI SDK stream → useAISDKRuntime state → AISDKMessageConverter → metadata.custom → aiSDKFormatAdapter → persistence → reload
```

### Clean Separation: No providerMetadata Pollution

The duration tracking now uses a clean architecture that **never touches providerMetadata**:

1. **Runtime timing state** (`useAISDKRuntime.tsx`)
   - Records start/end timestamps per reasoning part in local state (`reasoningTimings`)
   - When a part transitions to `state: "done"`, computes final duration (seconds), clamped to minimum 1 second
   - Stores in `reasoningDurations` map with keys `messageId:itemId` (or index)
   - **Does NOT write to AI SDK messages** - state is kept separate

2. **Message conversion** (`convertMessage.ts`)
   - Receives `reasoningDurations` via converter metadata parameter
   - Creates `ThreadMessage` with `metadata.custom.reasoningDurations`
   - Reads duration in this priority order:
     1. Runtime state (active streaming)
     2. `__assistant_ui_metadata.reasoningDurations` (reloaded from storage)
   - Returns `ReasoningMessagePart` with clean `duration` field

3. **Storage preparation** (`useExternalHistory.tsx`)
   - Before storage, extracts `metadata.custom.reasoningDurations` from ThreadMessage
   - Attaches to UIMessage as `__assistant_ui_metadata` (temporary bridge field)
   - This allows the storage adapter to access assistant-ui data without polluting AI SDK types

4. **Format adapter** (`aiSDKFormatAdapter.ts`)
   - Encodes: Extracts `__assistant_ui_metadata` from UIMessage → stores in `AISDKStorageFormat.__assistant_ui_metadata`
   - Decodes: Restores `__assistant_ui_metadata` to UIMessage for converter to read
   - Merges reasoning parts by `itemId`, strips encrypted metadata
   - **Storage format**: `{ ...uiMessage, __assistant_ui_metadata: { reasoningDurations } }`

5. **Reload path**
   - Storage returns messages with `__assistant_ui_metadata.reasoningDurations`
   - Converter reads from this field (runtime state is empty)
   - UI displays the persisted duration

## Key Lessons Learned

1. **Write metadata at the moment of completion** – Streaming updates are brittle, but committing the duration in the same effect that observes `state: "done"` prevents unmount races.
2. **Runtime owns authoritative timing** – Local state provides the trustworthy calculation; provider metadata is treated as a persistence mirror and only read when no runtime value exists.
3. **Hooks must respect SDK ownership** – Any real-time updates must cooperate with how the AI SDK manages message objects; naive `setMessages` loops cause runaway renders.

## Outstanding Gaps

1. **No live countdown** – Requirements call for a real-time timer in the reasoning header. With the hook removed, the UI displays only the final duration once reasoning completes.
2. Persistence is only supported for the AI SDK runtime.

## Next Steps

1. Update timing display to support minutes in addition to seconds.
2. Explore tap resources or alternative metadata channels so persistence no longer depends on post-completion message rewrites.
3. Keep test coverage focused on both the runtime (state derivation) and the converter/adapter to ensure persistence regressions are caught early.
