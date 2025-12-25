# Fix Branch Picker Capability Check Implementation Plan

## Overview

Fix a bug where BranchPickerPrevious and BranchPickerNext components allow users to click navigation arrows even when the runtime doesn't support branch switching, causing an error. The fix adds a missing check for `thread.capabilities.switchToBranch` to properly disable the buttons when the runtime lacks this capability.

## Current State Analysis

### The Bug
BranchPickerPrevious and BranchPickerNext have incomplete capability checks:
- ✅ They check `message.branchNumber` (are there branches?)
- ✅ They check `thread.capabilities.switchBranchDuringRun` (can switch during run?)
- ❌ They DO NOT check `thread.capabilities.switchToBranch` (can switch at all?)

**Files**:
- `packages/react/src/primitives/branchPicker/BranchPickerPrevious.tsx:34-44`
- `packages/react/src/primitives/branchPicker/BranchPickerNext.tsx:18-28`

### Impact
When using runtimes without `setMessages` (like Mastra runtime):
1. `capabilities.switchToBranch` is `false`
2. User edits a message → creates branches
3. Branch picker buttons become enabled (incorrectly)
4. User clicks button → throws error: "Runtime does not support switching branches"

### How Capabilities Work
From `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore.tsx:111-121`:
```typescript
this._capabilities = {
  switchToBranch: this._store.setMessages !== undefined,
  switchBranchDuringRun: false, // External stores never support branch switching during run
  // ...
};
```

**Key Logic**:
- `switchToBranch` = `true` only if runtime provides `setMessages` callback
- ExternalStore runtimes (AI SDK, LangGraph, Mastra) vary in support:
  - AI SDK: ✅ Provides `setMessages` → `switchToBranch: true`
  - LangGraph: ❌ No `setMessages` → `switchToBranch: false`
  - Mastra: ❌ No `setMessages` → `switchToBranch: false`

### Key Discoveries

**Established Pattern** (from similar components):
All capability-aware action buttons follow this pattern from `packages/react/src/utils/createActionButton.tsx:21-56`:
```typescript
const useActionButton = () => {
  const disabled = useAssistantState(({ thread, message }) => {
    // Check state conditions
    if (someCondition) return true;

    // Check runtime capability
    if (!thread.capabilities.someCapability) return true;

    return false;
  });

  if (disabled) return null;
  return callback;
};
```

**No Existing Tests**:
- No test files exist for BranchPicker components
- Need to create tests from scratch
- Similar components tested using `@testing-library/react` with vitest

## Desired End State

After this fix:
1. ✅ BranchPickerPrevious checks `switchToBranch` capability before enabling
2. ✅ BranchPickerNext checks `switchToBranch` capability before enabling
3. ✅ Buttons remain disabled in Mastra runtime (which lacks `setMessages`)
4. ✅ Buttons work correctly in AI SDK runtime (which provides `setMessages`)
5. ✅ Unit tests verify capability checking behavior
6. ✅ No regression in existing functionality

### Verification
- **Automated**: Unit tests pass, type checking passes
- **Manual**: Test with both Mastra and AI SDK examples

## What We're NOT Doing

- NOT adding `setMessages` to Mastra runtime (separate architectural decision)
- NOT changing the capability system architecture
- NOT modifying other BranchPicker components (Root, Number, Count are display-only)
- NOT adding integration/E2E tests (unit tests sufficient for this fix)
- NOT changing the error message in ExternalStoreThreadRuntimeCore

## Implementation Approach

**Strategy**: Add the missing capability check to both components following the established pattern from other action buttons. Add comprehensive unit tests to prevent regression.

**Reasoning**:
- Minimal code change (one line per component)
- Follows existing patterns consistently
- Fixes root cause directly
- Easy to verify and test

## Phase 1: Fix BranchPickerPrevious

### Overview
Add missing `switchToBranch` capability check to BranchPickerPrevious component.

### Changes Required

#### 1. BranchPickerPrevious Component
**File**: `packages/react/src/primitives/branchPicker/BranchPickerPrevious.tsx`

**Current code (lines 34-44)**:
```typescript
const disabled = useAssistantState(({ thread, message }) => {
  // Disabled if no previous branch
  if (message.branchNumber <= 1) return true;

  // Disabled if running and capability not supported
  if (thread.isRunning && !thread.capabilities.switchBranchDuringRun) {
    return true;
  }

  return false;
});
```

**Change to**:
```typescript
const disabled = useAssistantState(({ thread, message }) => {
  // Disabled if no previous branch
  if (message.branchNumber <= 1) return true;

  // Disabled if runtime doesn't support branch switching
  if (!thread.capabilities.switchToBranch) return true;

  // Disabled if running and capability not supported
  if (thread.isRunning && !thread.capabilities.switchBranchDuringRun) {
    return true;
  }

  return false;
});
```

**What changed**:
- Added check: `if (!thread.capabilities.switchToBranch) return true;`
- Placed after branch count check, before run state check
- Clear comment explains why disabled

### Success Criteria

#### Automated Verification:
- [ ] Type checking passes: `pnpm run build`
- [ ] Linting passes: `pnpm run lint`
- [ ] Prettier formatting: `pnpm run prettier`

#### Manual Verification:
- [ ] In Mastra example: edit message, verify Previous button is disabled
- [ ] In AI SDK example: edit message, verify Previous button is enabled
- [ ] No console errors when button is disabled

---

## Phase 2: Fix BranchPickerNext

### Overview
Add missing `switchToBranch` capability check to BranchPickerNext component (identical fix).

### Changes Required

#### 1. BranchPickerNext Component
**File**: `packages/react/src/primitives/branchPicker/BranchPickerNext.tsx`

**Current code (lines 18-28)**:
```typescript
const disabled = useAssistantState(({ thread, message }) => {
  // Disabled if no next branch
  if (message.branchNumber >= message.branchCount) return true;

  // Disabled if running and capability not supported
  if (thread.isRunning && !thread.capabilities.switchBranchDuringRun) {
    return true;
  }

  return false;
});
```

**Change to**:
```typescript
const disabled = useAssistantState(({ thread, message }) => {
  // Disabled if no next branch
  if (message.branchNumber >= message.branchCount) return true;

  // Disabled if runtime doesn't support branch switching
  if (!thread.capabilities.switchToBranch) return true;

  // Disabled if running and capability not supported
  if (thread.isRunning && !thread.capabilities.switchBranchDuringRun) {
    return true;
  }

  return false;
});
```

**What changed**:
- Same check as Previous: `if (!thread.capabilities.switchToBranch) return true;`
- Consistent placement and comment

### Success Criteria

#### Automated Verification:
- [ ] Type checking passes: `pnpm run build`
- [ ] Linting passes: `pnpm run lint`
- [ ] Prettier formatting: `pnpm run prettier`

#### Manual Verification:
- [ ] In Mastra example: edit message, verify Next button is disabled
- [ ] In AI SDK example: edit message, verify Next button is enabled
- [ ] Button state matches Previous button state (consistent behavior)

---

## Phase 3: Add Unit Tests

### Overview
Create comprehensive unit tests for both components to verify capability checking logic and prevent regression.

### Changes Required

#### 1. Create BranchPickerPrevious Test File
**File**: `packages/react/src/primitives/branchPicker/BranchPickerPrevious.test.tsx` (new file)

```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBranchPickerPrevious } from "./BranchPickerPrevious";

// Mock the context hooks
vi.mock("../../context", () => ({
  useAssistantApi: vi.fn(() => ({
    message: vi.fn(() => ({
      switchToBranch: vi.fn(),
    })),
  })),
  useAssistantState: vi.fn((selector) => {
    // Return value based on test case
    return selector({
      thread: {
        isRunning: false,
        capabilities: {
          switchToBranch: true,
          switchBranchDuringRun: false,
        },
      },
      message: {
        branchNumber: 2,
        branchCount: 3,
      },
    });
  }),
}));

describe("useBranchPickerPrevious", () => {
  it("should return null when branchNumber is 1 (no previous branch)", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: false,
          capabilities: { switchToBranch: true, switchBranchDuringRun: true },
        },
        message: { branchNumber: 1, branchCount: 2 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerPrevious());
    expect(result.current).toBeNull();
  });

  it("should return null when switchToBranch capability is false", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: false,
          capabilities: { switchToBranch: false, switchBranchDuringRun: false },
        },
        message: { branchNumber: 2, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerPrevious());
    expect(result.current).toBeNull();
  });

  it("should return null when running and switchBranchDuringRun is false", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: true,
          capabilities: { switchToBranch: true, switchBranchDuringRun: false },
        },
        message: { branchNumber: 2, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerPrevious());
    expect(result.current).toBeNull();
  });

  it("should return callback when enabled (idle + has previous + has capability)", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: false,
          capabilities: { switchToBranch: true, switchBranchDuringRun: false },
        },
        message: { branchNumber: 2, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerPrevious());
    expect(result.current).toBeInstanceOf(Function);
  });

  it("should return callback when running with switchBranchDuringRun capability", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: true,
          capabilities: { switchToBranch: true, switchBranchDuringRun: true },
        },
        message: { branchNumber: 2, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerPrevious());
    expect(result.current).toBeInstanceOf(Function);
  });
});
```

#### 2. Create BranchPickerNext Test File
**File**: `packages/react/src/primitives/branchPicker/BranchPickerNext.test.tsx` (new file)

```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBranchPickerNext } from "./BranchPickerNext";

// Mock the context hooks
vi.mock("../../context", () => ({
  useAssistantApi: vi.fn(() => ({
    message: vi.fn(() => ({
      switchToBranch: vi.fn(),
    })),
  })),
  useAssistantState: vi.fn((selector) => {
    return selector({
      thread: {
        isRunning: false,
        capabilities: {
          switchToBranch: true,
          switchBranchDuringRun: false,
        },
      },
      message: {
        branchNumber: 2,
        branchCount: 3,
      },
    });
  }),
}));

describe("useBranchPickerNext", () => {
  it("should return null when at last branch (branchNumber >= branchCount)", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: false,
          capabilities: { switchToBranch: true, switchBranchDuringRun: true },
        },
        message: { branchNumber: 3, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerNext());
    expect(result.current).toBeNull();
  });

  it("should return null when switchToBranch capability is false", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: false,
          capabilities: { switchToBranch: false, switchBranchDuringRun: false },
        },
        message: { branchNumber: 2, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerNext());
    expect(result.current).toBeNull();
  });

  it("should return null when running and switchBranchDuringRun is false", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: true,
          capabilities: { switchToBranch: true, switchBranchDuringRun: false },
        },
        message: { branchNumber: 2, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerNext());
    expect(result.current).toBeNull();
  });

  it("should return callback when enabled (idle + has next + has capability)", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: false,
          capabilities: { switchToBranch: true, switchBranchDuringRun: false },
        },
        message: { branchNumber: 2, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerNext());
    expect(result.current).toBeInstanceOf(Function);
  });

  it("should return callback when running with switchBranchDuringRun capability", () => {
    const { useAssistantState } = require("../../context");
    useAssistantState.mockImplementation((selector: any) =>
      selector({
        thread: {
          isRunning: true,
          capabilities: { switchToBranch: true, switchBranchDuringRun: true },
        },
        message: { branchNumber: 2, branchCount: 3 },
      }),
    );

    const { result } = renderHook(() => useBranchPickerNext());
    expect(result.current).toBeInstanceOf(Function);
  });
});
```

### Success Criteria

#### Automated Verification:
- [ ] All tests pass: `pnpm --filter @assistant-ui/react test`
- [ ] Test coverage includes all capability scenarios
- [ ] Tests run in CI pipeline
- [ ] No test warnings or errors

#### Manual Verification:
- [ ] Tests are readable and maintainable
- [ ] Test descriptions clearly explain what's being tested
- [ ] Mock setup is correct and isolated

---

## Phase 4: End-to-End Manual Testing

### Overview
Verify the fix works correctly in real examples with different runtimes.

### Test Scenarios

#### 1. Test with Mastra Runtime (no setMessages)
**Location**: `examples/with-mastra/` (or create test app)

**Steps**:
1. Start Mastra example: `pnpm dev`
2. Send initial message
3. Edit the message
4. **Verify**: Branch picker Previous/Next buttons are disabled
5. **Verify**: No console errors
6. **Verify**: Buttons have proper disabled styling

**Expected**:
- Buttons disabled because `capabilities.switchToBranch: false`
- No error thrown when buttons are disabled
- UI clearly shows buttons are not interactive

#### 2. Test with AI SDK Runtime (has setMessages)
**Location**: `examples/with-ai-sdk-v5/`

**Steps**:
1. Start AI SDK example: `pnpm dev`
2. Send initial message
3. Edit the message
4. **Verify**: Branch picker Previous/Next buttons are enabled
5. Click Previous button
6. **Verify**: Switches to original message successfully
7. Click Next button
8. **Verify**: Switches to edited message successfully

**Expected**:
- Buttons enabled because `capabilities.switchToBranch: true`
- Navigation works smoothly
- No errors or warnings

#### 3. Test During Running State
**Location**: Any example with streaming

**Steps**:
1. Send message that triggers streaming
2. While streaming, edit a previous message
3. **Verify**: Branch picker buttons remain disabled during stream
4. Wait for stream to complete
5. **Verify**: Buttons enable after completion (if runtime supports it)

**Expected**:
- Buttons respect both `switchToBranch` and `switchBranchDuringRun`
- No race conditions or flickering

### Success Criteria

#### Manual Verification:
- [ ] Mastra runtime: buttons correctly disabled
- [ ] AI SDK runtime: buttons correctly enabled
- [ ] Navigation works in supported runtimes
- [ ] No errors in any scenario
- [ ] Consistent behavior across examples
- [ ] Good UX (clear disabled state)

---

## Testing Strategy

### Unit Tests
**What to test**:
- Disabled when `branchNumber <= 1` (Previous) or `>= branchCount` (Next)
- Disabled when `switchToBranch` is `false`
- Disabled when running and `switchBranchDuringRun` is `false`
- Enabled when all conditions pass

**Key edge cases**:
- Runtime with no capabilities
- Runtime with partial capabilities
- State changes during run

### Manual Testing
**End-to-end scenarios**:
- Different runtime types (Mastra, AI SDK, LangGraph)
- Edit → navigate → edit again
- Multiple branches (3+)
- Browser compatibility

## Performance Considerations

**Impact**: Negligible
- Added one additional boolean check per render
- Check is inline, no additional function calls
- Uses existing memoized state selector

**No performance optimizations needed** - the change is minimal.

## Migration Notes

**Not applicable** - this is a bug fix, not a breaking change.

**Backwards compatibility**: ✅ Full
- No API changes
- No behavior changes for correctly implemented runtimes
- Fixes incorrect behavior for runtimes without `setMessages`

## References

- Original research: `notes/research/branch-picker-error-missing-capability-check.md`
- ExternalStoreAdapter type: `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreAdapter.tsx:67`
- Capability configuration: `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore.tsx:111-121`
- Error location: `packages/react/src/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore.tsx:230-241`
- Similar pattern: `packages/react/src/primitives/actionBar/ActionBarReload.tsx:35-40`
- Testing pattern: `packages/react-langgraph/src/useLangGraphRuntime.test.tsx:1-50`
