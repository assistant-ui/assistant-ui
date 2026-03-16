---
date: 2025-10-22T12:45:00-07:00
researcher: Claude (claude-sonnet-4-5)
git_commit: eda13ed3a58798221b9081a80bdf76601d0b595f
branch: aui-25-dedicated-mastra-implementation
repository: aui-25-dedicated-mastra-implementation
topic: "Root cause of infinite loop in useMastraWorkflows test"
tags: [research, codebase, react-mastra, testing, infinite-loop, useEffect]
status: complete
last_updated: 2025-10-22
last_updated_by: Claude
---

# Research: Root Cause of Infinite Loop in useMastraWorkflows Test

**Date**: 2025-10-22T12:45:00-07:00
**Researcher**: Claude (claude-sonnet-4-5)
**Git Commit**: eda13ed3a58798221b9081a80bdf76601d0b595f
**Branch**: aui-25-dedicated-mastra-implementation
**Repository**: aui-25-dedicated-mastra-implementation

## Research Question

Why does the test "should start workflow execution" in `useMastraWorkflows.test.ts` get stuck in an infinite loop with repeated subscribe/unsubscribe calls?

## Summary

The infinite loop is caused by a **dependency cycle in a useEffect hook**. The useEffect (lines 377-492 in `useMastraWorkflows.ts`) has `workflowState` in its dependency array, but the effect's error handler can update `workflowState`, causing the effect to re-run indefinitely. Additionally, the test doesn't properly mock the SSE endpoint, causing the subscription to fail immediately and trigger the error handler.

## Detailed Findings

### The Infinite Loop Cycle

The loop follows this pattern:

1. **Initial trigger**: `startWorkflow()` calls `setWorkflowState()` (useMastraWorkflows.ts:247)
2. **Effect runs**: useEffect triggers because `workflowState` changed (useMastraWorkflows.ts:377)
3. **Subscription attempt**: Calls `mastraWorkflow.subscribe()` (useMastraWorkflows.ts:473)
4. **Fetch fails**: Tries to fetch `/api/workflow/events/${workflowState.id}` but endpoint is not mocked
5. **Error thrown**: Subscribe function throws error because `response.ok` is false (useMastraWorkflows.ts:131-133)
6. **Error handler called**: The `onError` callback is invoked (useMastraWorkflows.ts:476-488)
7. **State updated**: Error handler calls `setWorkflowState(errorState)` (useMastraWorkflows.ts:485)
8. **Cleanup runs**: Previous effect cleanup calls `unsubscribe()` (logs "Mastra workflow unsubscribe")
9. **Effect re-runs**: New subscription is created (logs "Mastra workflow subscribe")
10. **Repeat**: Steps 4-9 repeat indefinitely

### Root Cause Analysis

#### Primary Issue: Dependency Cycle

The useEffect hook has a problematic dependency array:

```typescript
// useMastraWorkflows.ts:377-492
useEffect(() => {
  if (!workflowState) return;

  const handleWorkflowEvent = (event: { ... }) => {
    // ... handles events and calls setWorkflowState
  };

  const unsubscribe = mastraWorkflow.subscribe(
    workflowState.id,
    handleWorkflowEvent,
    (error) => {
      // Error handler that updates state
      setWorkflowState(errorState); // Line 485 - causes re-render
      setIsRunning(false);
      setIsSuspended(false);
    },
  );

  return () => unsubscribe();
}, [workflowState, config]); // ⚠️ workflowState dependency causes re-runs
```

**The problem**: The effect depends on `workflowState`, but the effect's callbacks can update `workflowState`, creating a circular dependency.

#### Secondary Issue: Missing Test Mock

The test mocks the workflow start endpoint but not the SSE events endpoint:

```typescript
// useMastraWorkflows.test.ts:24-63
beforeEach(() => {
  (global.fetch as any).mockImplementation(async (url: string, options: any) => {
    // ✅ Mocked: /api/workflow
    if (url === "/api/workflow" && options?.method === "POST") { ... }

    // ✅ Mocked: /api/workflow/resume
    if (url === "/api/workflow/resume" && options?.method === "POST") { ... }

    // ❌ NOT mocked: /api/workflow/events/${workflowId}
    // Falls through to default error response
    return {
      ok: false,
      json: async () => ({ error: "Unexpected fetch call" }),
    };
  });
});
```

This causes every subscription attempt to fail immediately, triggering the error handler.

#### Additional Contributing Factors

1. **Event handler updates state**: Even if the subscription succeeds, the `handleWorkflowEvent` function updates `workflowState` when it receives events (useMastraWorkflows.ts:419, 439, 457, 485), which would still trigger the dependency cycle.

2. **Effect closure captures stale state**: The `handleWorkflowEvent` function closes over `workflowState`, using it in spread operations like `{ ...workflowState, ... }`, which can lead to stale state issues.

## Code References

- `packages/react-mastra/src/useMastraWorkflows.ts:377-492` - The problematic useEffect hook
- `packages/react-mastra/src/useMastraWorkflows.ts:485` - Error handler that updates state
- `packages/react-mastra/src/useMastraWorkflows.ts:247` - Initial state update in startWorkflow
- `packages/react-mastra/src/useMastraWorkflows.ts:113-220` - Subscribe function that fails
- `packages/react-mastra/src/useMastraWorkflows.test.ts:73-92` - The failing test
- `packages/react-mastra/src/useMastraWorkflows.test.ts:24-63` - Test setup with incomplete mocks

## Architecture Insights

### Pattern Identified: React Hook Subscription Pattern

The code follows a common React pattern for managing subscriptions in effects, but with a critical flaw:

```typescript
// Common pattern (with the flaw)
useEffect(() => {
  const unsubscribe = subscribe(stateValue, (update) => {
    setState(update); // ⚠️ Updates the dependency
  });
  return unsubscribe;
}, [stateValue]); // ⚠️ Depends on what it updates
```

### Recommended Pattern

The subscription should depend on a stable identifier, not the entire state object:

```typescript
// Correct pattern
useEffect(() => {
  if (!stateId) return;

  const unsubscribe = subscribe(stateId, (update) => {
    setState(update); // Safe: doesn't update stateId
  });
  return unsubscribe;
}, [stateId]); // ✅ Stable identifier
```

## Proposed Solutions

### Solution 1: Use Stable Identifier in Dependencies (Recommended)

Change the dependency array to use only the workflow ID:

```typescript
useEffect(() => {
  if (!workflowState) return;

  // ... subscription logic ...

  return () => unsubscribe();
}, [workflowState?.id, config]); // ✅ Only re-run if ID changes
```

**Pros**: Minimal code changes, preserves existing logic
**Cons**: Need to ensure `config` is also stable

### Solution 2: Use Ref for State

Store the current state in a ref to avoid the dependency:

```typescript
const workflowStateRef = useRef(workflowState);
workflowStateRef.current = workflowState;

useEffect(() => {
  if (!workflowStateRef.current) return;

  const handleWorkflowEvent = (event) => {
    const currentState = workflowStateRef.current;
    // Use currentState instead of workflowState
  };

  // ... subscription logic ...

  return () => unsubscribe();
}, [workflowStateRef.current?.id]); // Only re-run if ID changes
```

**Pros**: Guarantees fresh state in callbacks
**Cons**: More complex, requires careful ref management

### Solution 3: Separate Subscription Logic

Move subscription to a separate effect that only runs once:

```typescript
// Effect 1: Subscribe once when workflow starts
useEffect(() => {
  if (!workflowState?.id) return;

  const unsubscribe = mastraWorkflow.subscribe(
    workflowState.id,
    handleWorkflowEvent,
    handleError
  );

  return () => unsubscribe();
}, [workflowState?.id]); // Only workflow ID

// Effect 2: Update handlers when state/config changes
useEffect(() => {
  // Update callback refs or similar
}, [workflowState, config]);
```

**Pros**: Clear separation of concerns
**Cons**: Requires restructuring the hook

### Solution 4: Fix Test Mocks

Add proper mock for the SSE endpoint:

```typescript
beforeEach(() => {
  (global.fetch as any).mockImplementation(async (url: string, options: any) => {
    // ... existing mocks ...

    // Add SSE endpoint mock
    if (url.startsWith("/api/workflow/events/")) {
      // Return a mock ReadableStream or mock response
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      };
    }

    // ... default fallback ...
  });
});
```

**Pros**: Prevents immediate subscription failures
**Cons**: Doesn't fix the underlying dependency cycle issue

## Recommendation

**Implement Solution 1** (stable identifier in dependencies) combined with **Solution 4** (proper test mocks):

1. Change the useEffect dependency array to use `workflowState?.id` instead of `workflowState`
2. Add proper mocks for the SSE endpoint in tests
3. Ensure the `config` object is stable (memoized or stable reference)

This combination fixes both the dependency cycle and the test infrastructure issues.

## Testing Verification

After implementing the fix, verify:

1. ✅ Test completes without infinite loop
2. ✅ Subscribe is called once per workflow ID
3. ✅ Unsubscribe is called only on cleanup or ID change
4. ✅ State updates from events don't trigger re-subscription
5. ✅ Error handling doesn't cause re-subscription

## Open Questions

1. Should the `config` object be memoized to ensure stability?
2. Should there be a mechanism to prevent rapid re-subscriptions (debouncing)?
3. How should the hook handle workflow ID changes during an active subscription?
4. Should the SSE connection have retry logic with exponential backoff?
