---
date: 2025-10-21T00:00:00Z
researcher: Claude
git_commit: 101b3c945739c6d8a64c27d9c25049922893b857
branch: aui-25-dedicated-mastra-implementation
repository: aui-25-dedicated-mastra-implementation
topic: "Branch Picker Error: Missing switchToBranch Capability Check"
tags: [research, codebase, branch-picker, external-store, mastra, bug]
status: complete
last_updated: 2025-10-21
last_updated_by: Claude
---

# Research: Branch Picker Error - Missing switchToBranch Capability Check

**Date**: 2025-10-21
**Researcher**: Claude
**Git Commit**: 101b3c945739c6d8a64c27d9c25049922893b857
**Branch**: aui-25-dedicated-mastra-implementation
**Repository**: aui-25-dedicated-mastra-implementation

## Research Question

What is causing this error when editing a message and then clicking the left arrow (BranchPickerPrevious) to switch back to the original message?

```
Error: Runtime does not support switching branches.
    at ExternalStoreThreadRuntimeCore.switchToBranch
    at MessageRuntimeImpl.switchToBranch
    at Proxy.switchToBranch
    at useBranchPickerPrevious.useCallback[callback]
```

## Summary

**Root Cause**: The BranchPickerPrevious and BranchPickerNext components have an incomplete capability check. They only check `thread.capabilities.switchBranchDuringRun` when the thread is running, but they do NOT check `thread.capabilities.switchToBranch` when the thread is idle. This allows the buttons to be enabled in runtimes that don't support branch switching at all (like Mastra runtime, which doesn't provide `setMessages`).

**Impact**: When using Mastra runtime (or any ExternalStore runtime without `setMessages`), users can edit messages which creates branches, but then clicking the branch navigation arrows throws an error instead of being disabled.

## Detailed Findings

### 1. How Branch Switching Capability Works

The ExternalStoreThreadRuntimeCore determines branch switching capability based on whether the adapter provides `setMessages`:

**File**: `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore.tsx:111-121`

```typescript
this._capabilities = {
  switchToBranch: this._store.setMessages !== undefined,
  switchBranchDuringRun: false, // External store never supports branch switching during run
  edit: this._store.onEdit !== undefined,
  reload: this._store.onReload !== undefined,
  cancel: this._store.onCancel !== undefined,
  speech: this._store.adapters?.speech !== undefined,
  unstable_copy: this._store.unstable_capabilities?.copy !== false,
  attachments: !!this._store.adapters?.attachments,
  feedback: !!this._store.adapters?.feedback,
};
```

**Key Logic**:
- `switchToBranch` = `true` if `setMessages` callback is provided
- `switchToBranchDuringRun` = always `false` for external stores

### 2. Mastra Runtime Configuration

The Mastra runtime does NOT provide `setMessages`, which means `switchToBranch` capability should be `false`.

**File**: `packages/react-mastra/src/useMastraRuntime.ts:228-366`

```typescript
const runtime = useExternalStoreRuntime({
  isRunning,
  messages: filteredMessages as any,
  onNew: handleNew,
  onEdit: async (message: any) => {
    // ... edit implementation
  },
  onReload: async () => {
    // ... reload stub
  },
  adapters: config.adapters,
  convertMessage: LegacyMastraMessageConverter as any,
  extras: { /* ... */ },
  // ❌ NO setMessages PROVIDED
});
```

**Why no setMessages?**:
- Mastra uses client-side message accumulation pattern
- Messages are managed through local state (`useState`)
- Edit functionality is implemented manually in `onEdit` handler
- No external state synchronization needed

### 3. The Bug in BranchPickerPrevious

The BranchPickerPrevious component has an incomplete capability check:

**File**: `packages/react/src/primitives/branchPicker/BranchPickerPrevious.tsx:34-51`

```typescript
const disabled = useAssistantState(({ thread, message }) => {
  // Disabled if no previous branch
  if (message.branchNumber <= 1) return true;

  // Disabled if running and capability not supported
  if (thread.isRunning && !thread.capabilities.switchBranchDuringRun) {
    return true;
  }

  // ❌ BUG: Missing check for switchToBranch when NOT running
  return false;
});

const callback = useCallback(() => {
  api.message().switchToBranch({ position: "previous" });
}, [api]);

if (disabled) return null;
return callback;
```

**The Problem**:
1. ✅ Checks if there's a previous branch (`branchNumber <= 1`)
2. ✅ Checks `switchBranchDuringRun` when thread is running
3. ❌ Does NOT check `switchToBranch` when thread is idle
4. ❌ Button becomes enabled when it shouldn't be

### 4. Error Flow

Here's what happens when the error occurs:

**Sequence**:
1. User edits a message → Creates a new branch
2. Edit operation completes → `isRunning` becomes `false`
3. Message now has `branchNumber = 2` (original + edited)
4. BranchPickerPrevious evaluates:
   - `message.branchNumber <= 1` → `false` (there are 2 branches)
   - `thread.isRunning` → `false` (edit completed)
   - Second check doesn't trigger → `disabled = false`
5. Button is enabled and visible to user
6. User clicks Previous button
7. Calls `api.message().switchToBranch({ position: "previous" })`
8. Delegates to MessageRuntimeImpl.switchToBranch
9. Calls ExternalStoreThreadRuntimeCore.switchToBranch
10. **Throws error**: "Runtime does not support switching branches"

**File**: `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore.tsx:230-241`

```typescript
public override switchToBranch(branchId: string): void {
  if (!this._store.setMessages)
    throw new Error("Runtime does not support switching branches.");

  // Silently ignore branch switches while running
  if (this._store.isRunning) {
    return;
  }

  this.repository.switchToBranch(branchId);
  this.updateMessages(this.repository.getMessages());
}
```

## Code References

- `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore.tsx:111-121` - Capability configuration
- `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore.tsx:230-241` - switchToBranch implementation and error throw
- `packages/react/src/primitives/branchPicker/BranchPickerPrevious.tsx:34-51` - **Bug location** - incomplete capability check
- `packages/react/src/primitives/branchPicker/BranchPickerNext.tsx:18-26` - Same bug exists in Next button
- `packages/react-mastra/src/useMastraRuntime.ts:228-366` - Mastra runtime without setMessages
- `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreAdapter.tsx:67` - setMessages type definition

## Solution

Add a check for `thread.capabilities.switchToBranch` in the disabled logic:

### BranchPickerPrevious Fix

**File**: `packages/react/src/primitives/branchPicker/BranchPickerPrevious.tsx:34-44`

```typescript
const disabled = useAssistantState(({ thread, message }) => {
  // Disabled if no previous branch
  if (message.branchNumber <= 1) return true;

  // ✅ ADD: Check if runtime supports branch switching at all
  if (!thread.capabilities.switchToBranch) return true;

  // Disabled if running and capability not supported
  if (thread.isRunning && !thread.capabilities.switchBranchDuringRun) {
    return true;
  }

  return false;
});
```

### BranchPickerNext Fix

**File**: `packages/react/src/primitives/branchPicker/BranchPickerNext.tsx:18-28`

Apply the same fix to BranchPickerNext:

```typescript
const disabled = useAssistantState(({ thread, message }) => {
  if (message.branchNumber >= message.branchCount) return true;

  // ✅ ADD: Check if runtime supports branch switching at all
  if (!thread.capabilities.switchToBranch) return true;

  if (thread.isRunning && !thread.capabilities.switchBranchDuringRun) {
    return true;
  }

  return false;
});
```

## Architecture Insights

### ExternalStore Capability Patterns

Different integrations have different capability levels:

| Runtime | `setMessages` | `switchToBranch` | `onEdit` | Notes |
|---------|--------------|-----------------|----------|-------|
| AI SDK | ✅ Yes | ✅ Yes | ✅ Yes | Full branch support via `chatHelpers.setMessages` |
| LangGraph | ❌ No | ❌ No | ❌ No | Internal state management, no branch support |
| Mastra | ❌ No | ❌ No | ✅ Yes | Manual edit handling, no branch switching |
| LocalThread | ✅ N/A | ✅ Yes | ✅ Yes | Built-in repository with full branch support |

### Why Two Capabilities?

The runtime has two separate branch-related capabilities:

1. **`switchToBranch`**: Can switch between branches when idle
   - Requires `setMessages` callback for external stores
   - Used by branch picker Previous/Next buttons

2. **`switchBranchDuringRun`**: Can switch between branches while streaming
   - Always `false` for external stores
   - Only `true` for LocalThreadRuntimeCore
   - Used to disable branch picker during active runs

This separation allows fine-grained control over when branch switching is allowed.

## Testing Recommendations

### Test Case 1: Mastra Runtime with Edit
1. Setup Mastra runtime
2. Send initial message
3. Edit the message
4. Verify branch picker buttons are disabled (not visible)
5. Attempt to call switchToBranch API directly
6. Should throw clear error

### Test Case 2: AI SDK Runtime with Edit
1. Setup AI SDK runtime
2. Send initial message
3. Edit the message
4. Verify branch picker buttons are enabled
5. Click Previous/Next buttons
6. Should navigate between branches successfully

### Test Case 3: During Run
1. Setup any runtime with `switchToBranch: true`
2. Start streaming response
3. Verify branch picker is disabled during run
4. Wait for completion
5. Verify branch picker re-enables after run

## Related Components

All BranchPicker primitives that may need similar fixes:
- `packages/react/src/primitives/branchPicker/BranchPickerRoot.tsx`
- `packages/react/src/primitives/branchPicker/BranchPickerPrevious.tsx` - **Needs fix**
- `packages/react/src/primitives/branchPicker/BranchPickerNext.tsx` - **Needs fix**
- `packages/react/src/primitives/branchPicker/BranchPickerNumber.tsx` - Display only, no fix needed
- `packages/react/src/primitives/branchPicker/BranchPickerCount.tsx` - Display only, no fix needed

## Open Questions

1. Should BranchPickerRoot also check capabilities and hide itself entirely when branch switching is not supported?
2. Should the error message from ExternalStoreThreadRuntimeCore.switchToBranch be more user-friendly?
3. Should there be a way to show disabled branch picker UI to indicate branches exist but can't be navigated?
4. Could Mastra runtime eventually support branch switching if it provides setMessages in the future?
