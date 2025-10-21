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
AI SDK stream → useAISDKRuntime state → AISDKMessageConverter → aiSDKFormatAdapter → persistence → reload
```

1. **Runtime timing state**
   - `useAISDKRuntime.tsx` records start/end timestamps per reasoning part (`reasoningTimings`).
   - When a part transitions to `state: "done"`, the runtime computes the final duration (seconds) and stores it in `reasoningDurations`.
   - A follow-up effect ensures that completed reasoning parts receive the finalized duration inside `providerMetadata['assistant-ui']` by issuing a single `setMessages` update when the stored value differs.
   - Keys follow the `messageId:itemId` (or index) pattern so merged reasoning blocks share a single entry.

2. **Converter responsibilities**
   - `convertMessage.ts` reads `metadata.reasoningDurations` to obtain the finished value.
   - If runtime data is unavailable (e.g., loading historical messages), it falls back to `providerMetadata['assistant-ui'].duration`.
   - The converter remains a pure transformer: it returns the duration for UI consumption but no longer mutates the underlying message object.

3. **Format adapter**
   - `aiSDKFormatAdapter.ts` merges reasoning parts by `itemId`, strips unsupported metadata, and preserves the injected duration when saving to the cloud.

4. **Reload path**
   - On page refresh, history loading returns messages containing the stored duration. Runtime timing state starts empty; the converter picks up the persisted value and the UI shows the correct number of seconds.

## Key Lessons Learned

1. **Finalize metadata after completion** – Streaming updates are brittle, but a post-completion sync keeps provider metadata aligned without racing the SDK.
2. **State + metadata works** – Runtime state provides reliable calculations; metadata ensures long-term storage.
3. **Hooks must respect SDK ownership** – Any real-time updates must cooperate with how the AI SDK manages message objects; naive `setMessages` loops cause runaway renders.

## Outstanding Gaps

1. **No live countdown** – Requirements call for a real-time timer in the reasoning header. With the hook removed, the UI displays only the final duration once reasoning completes.
2. Persistence is only supported for the AI SDK runtime.

## Next Steps

1. Update timing display to support minutes in addition to seconds.
2. Explore tap resources or alternative metadata channels so persistence no longer depends on post-completion message rewrites.
3. Keep test coverage focused on both the runtime (state derivation) and the converter/adapter to ensure persistence regressions are caught early.
