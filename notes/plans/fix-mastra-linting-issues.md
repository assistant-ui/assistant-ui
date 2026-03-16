# Fix Mastra Linting Issues Implementation Plan

## Overview

This plan addresses linting issues discovered in the `@assistant-ui/react-mastra` package, specifically unused variable errors that are causing the linting process to fail. Instead of simply renaming the variables, we'll properly use them in the test code.

## Current State Analysis

The linting process is failing due to two unused variable errors in `packages/react-mastra/tests/integration/useMastraMemory.integration.test.ts`:

1. Line 33: `'body' is assigned a value but never used` - This variable should be parsed to verify the request body in tests
2. Line 184: `'threadId' is assigned a value but never used` - This variable should be used to verify the created thread ID

According to the ESLint configuration in `packages/x-buildutils/eslint/index.ts`, unused variables are only allowed if they match the pattern `^_` (starting with underscore). Currently, these variables don't follow that convention and are genuinely unused.

## Desired End State

After implementing this plan, the linting process should pass without errors for the react-mastra package. The unused variables should be properly utilized in the test assertions to verify functionality.

### Key Discoveries:

- The ESLint configuration at `packages/x-buildutils/eslint/index.ts:26-33` defines strict rules for unused variables
- The test file `packages/react-mastra/tests/integration/useMastraMemory.integration.test.ts` contains variables that violate these rules
- The `body` variable in the mock fetch implementation should be parsed and used for verification
- The `threadId` variable should be used in assertions to verify the created thread ID

## What We're NOT Doing

- We're not addressing the `no-html-link-for-pages` configuration warning as it's not directly related to the code errors
- We're not changing the ESLint configuration rules themselves
- We're not adding new functionality to the code, only making proper use of existing variables

## Implementation Approach

We'll modify the test file to properly use the variables that are currently unused:

1. Parse the `body` variable in the mock fetch implementation to verify request payloads
2. Use the `threadId` variable in test assertions to verify the created thread ID

## Phase 1: Fix Unused Body Variable in Mock Implementation

### Overview

Fix the unused `body` variable by parsing it and using it in the mock fetch implementation for verification.

### Changes Required:

#### 1. Test File

**File**: `packages/react-mastra/tests/integration/useMastraMemory.integration.test.ts`
**Changes**: Parse the body from options and use it in the response to simulate real API behavior.

```typescript
// In the mock fetch implementation, replace line 33:
// const body = await options.body;
// With proper parsing and usage:
const body = options.body ? JSON.parse(options.body) : {};
```

### Success Criteria:

#### Automated Verification:

- [ ] Linting passes for the body variable: `pnpm --filter=@assistant-ui/react-mastra lint`
- [ ] Tests continue to pass: `pnpm --filter=@assistant-ui/react-mastra test`

---

## Phase 2: Fix Unused ThreadId Variable in Tests

### Overview

Fix the unused `threadId` variable by adding assertions to verify the created thread ID.

### Changes Required:

#### 1. Test File

**File**: `packages/react-mastra/tests/integration/useMastraMemory.integration.test.ts`
**Changes**: Add assertions to verify the created thread ID.

```typescript
// In the first test, after line 98, add:
expect(threadId).toBe("test-thread-id");

// In the second test, after line 186, add:
expect(threadId).toBeDefined();
```

### Success Criteria:

#### Automated Verification:

- [ ] Linting passes for the threadId variable: `pnpm --filter=@assistant-ui/react-mastra lint`
- [ ] All tests continue to pass: `pnpm --filter=@assistant-ui/react-mastra test`

---

## Testing Strategy

### Unit Tests:

- No new unit tests needed as we're only fixing existing test code
- Existing tests should continue to pass with the fixes

### Integration Tests:

- Run the existing integration tests to ensure no functionality is broken

### Manual Testing Steps:

1. Run `pnpm --filter=@assistant-ui/react-mastra lint` to verify linting passes
2. Run `pnpm --filter=@assistant-ui/react-mastra test` to ensure tests still pass
3. Verify that the body parsing correctly handles the POST request payloads
4. Verify that the threadId assertions work as expected

## Performance Considerations

No performance considerations as we're only modifying test code.

## Migration Notes

No migration needed as this is just fixing test code to be compliant with linting rules.

## References

- Original ticket: This is a direct linting issue fix
- Related research: `notes/research/automated-testing-research.md`
- Similar implementation: Pattern follows standard testing practices in other packages
