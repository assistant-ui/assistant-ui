# Streaming Spinner Regression Investigation

## Summary

A regression was reported where the loading spinner indicator ("●") in the thread UI disappears before assistant text/reasoning content starts streaming.

- Previous behavior: spinner stayed visible from user send until first visible assistant content arrived.
- Current behavior: spinner disappears roughly 500ms to 1s before visible streaming begins.

This document captures the investigation, findings, leading regression hypothesis, and secondary hypotheses if the leading one is incorrect.

## User-Facing Symptom

The default text renderer in `MessagePartsGrouped` includes:

```tsx
Text: () => (
  <p style={{ whiteSpace: "pre-line" }}>
    <MessagePartPrimitiveText />
    <MessagePartPrimitiveInProgress>
      <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
    </MessagePartPrimitiveInProgress>
  </p>
)
```

The spinner is shown only when:

- `MessagePartPrimitiveInProgress` sees `s.part.status.type === "running"`.

So the regression is about when part status exits `running`, not about the dot rendering itself.

## Scope of Investigation

Initial suspected commits provided:

- `20d7ff811` - fix: address review feedback (loading state leak, retry race, etc.)
- `c77c51bf3` - fix(cloud): prevent assistant messages disappearing during streaming
- `77af8c3b3` - fix(critial): runtime unresponsive after strict mode load
- `988312539` - fix(react): merge reasoning parts with same parentId in ExternalStoreRuntime
- `acbaf0793` - feat(assistant-stream): framework agnostic

Additional investigation widened to:

- thread/message primitive changes in last ~2 months
- store migration and provider wiring
- AI SDK integration and dependency updates
- `packages/ui/src/components/assistant-ui/thread.tsx` history

## Key Technical Paths Verified

### Spinner gate

- `packages/react/src/primitives/messagePart/MessagePartInProgress.tsx`
- Condition remains `s.part.status.type === "running"`.

### Running status generation

- `packages/react-ai-sdk/src/ui/use-chat/useAISDKRuntime.tsx`
  - `isRunning = chatHelpers.status === "submitted" || chatHelpers.status === "streaming" || hasExecutingTools`
- `packages/react/src/legacy-runtime/runtime-cores/external-store/external-message-converter.tsx`
  - uses `getAutoStatus(...)`
- `packages/react/src/legacy-runtime/runtime-cores/external-store/auto-status.tsx`
  - last message is `running` only when `isLast && isRunning`

No direct logic change was found in the suspect commits that explicitly changes this running transition.

## What the Suspect Commits Actually Changed

### 1) `20d7ff811`

Primary changes in old `packages/cloud/src/ai-sdk/useSync.ts`:

- added `setIsLoading(false)` for null-thread reset path
- added retry-timeout cleanup in effect cleanup

This affects cloud hook loading lifecycle, but does not directly change `part.status.type` driving `MessagePartPrimitiveInProgress`.

### 2) `c77c51bf3`

Changes in old `useSync.ts`:

- added `chat.status` awareness
- skipped persisting last assistant message while `submitted/streaming`

This is persistence synchronization logic, not the direct runtime part-status transition logic.

### 3) `77af8c3b3`

Touches `packages/tap/src/tapSubscribableResource.ts` (strict mode/mount scheduler behavior). No explicit part running transition changes.

### 4) `988312539`

Adjusts reasoning-part merging by `parentId` in external message converter. No direct run-state transition logic changes.

### 5) `acbaf0793`

Mainly tools schema conversion transport refactor. No direct spinner state logic.

## Additional Findings from 2-Month History

### `thread.tsx` and UI thread component changes

- `packages/ui/src/components/assistant-ui/thread.tsx` was reviewed across recent commits.
- Changes were mostly suggestions/quote toolbar and selector syntax updates.
- No change there explains early spinner disappearance.

### AI SDK dependency bumps (important context)

`@assistant-ui/react-ai-sdk` dependency updates:

- `ai` and `@ai-sdk/react` advanced in Feb 2026 through dependency-only commits.
- This can alter observed status timing without app code changes.

However, direct source diff checks of AI SDK chat status internals across tested versions did not surface a clear status-transition semantic change in the core status setter path itself.

## Leading Regression Hypothesis

## Candidate: `9314b36d9` (store migration)

`9314b36d9` migrated critical context providers and state selectors to `@assistant-ui/store`:

- `MessagePartInProgress` switched from legacy assistant context to `useAuiState`
- `TextMessagePartProvider` rewritten to store client resource model
- `PartByIndexProvider` / `MessageByIndexProvider` switched to `Derived` scopes

Why this is the strongest candidate:

- It directly touches the precise scope/provider chain that computes `s.part.status.type` for the spinner.
- The symptom is timing-specific and UI-state derived, consistent with subtle scope update timing differences.
- Suspect cloud commits do not directly own the spinner condition path.

## If `9314b36d9` Is Not the Root Cause

Secondary hypotheses:

1. `tap`/store scheduling interaction
- Later store/tap fixes (including strict mode related) may create a small status propagation gap where `part.status` transitions to non-running before first text part render.

2. External-store conversion + optimistic message interaction
- `ExternalStoreThreadRuntimeCore` auto-status and optimistic assistant message insertion may produce a transient non-running state when message parts are still empty.

3. AI SDK status vs visible-content mismatch
- Even if status logic itself is stable, runtime mapping may not preserve the intended UX contract: "keep spinner until first visible content".
- This can manifest when stream metadata/events happen before text parts.

4. Content-part provider fallback behavior
- `TextMessagePartProvider` creates synthetic part status from `isRunning` when rendering empty/default text blocks. Provider scope timing changes may alter when this fallback is active.

## Why This Is Hard to Spot in Diffs

The user-visible bug is not a single obvious branch flip. It is likely caused by timing of updates between:

- thread/message store state
- part scope derivation
- auto-status generation
- render of empty/default text part + in-progress child

Small ordering differences can produce a short spinner drop even when all individual pieces appear logically correct.

## Recommended Next Validation Steps

1. Instrument part status transitions
- Log `{ messageId, partIndex, partStatus, chatStatus, messagePartsLength, timestamp }` in:
  - `MessagePartInProgress`
  - external message converter output
  - `useAISDKRuntime` (isRunning source)

2. Add a focused regression test
- Integration test asserting spinner remains visible until first assistant text/reasoning part appears.
- Simulate delayed first text token with intermediate stream events.

3. Compare behavior before/after `9314b36d9`
- Run same scenario in a local branch checkout around this commit boundary and diff transition logs.

4. Consider defensive UX condition
- Keep spinner visible when last assistant message exists but has no visible text/reasoning yet, even if status briefly flips.
- This can reduce user-visible flake while root-cause is confirmed.

## Current Conclusion

Most likely regression source: **`9314b36d9` store/provider migration path**, not the originally suspected cloud hook commits.

Confidence: moderate (based on code-path ownership and elimination), pending instrumented timing verification.
