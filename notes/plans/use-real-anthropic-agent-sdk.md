# Use Real Anthropic Agent SDK Implementation Plan

## Overview

The agent-dashboard-mvp example currently has a flag `USE_REAL_SDK = false` that causes it to use a mock implementation (`AISDKTaskController`) with simulated tools instead of the real `@anthropic-ai/claude-agent-sdk`. This plan addresses switching to the real SDK and removing all mock/custom implementations.

## Current State Analysis

### What Exists Now

1. **Two TaskController implementations:**
   - `TaskController.ts` - Uses real `@anthropic-ai/claude-agent-sdk` with `query()` function
   - `AISDKTaskController.ts` - Uses Vercel AI SDK with **simulated/mocked tools**

2. **SDK Selection Flag** (`route.ts:16-18`):
   ```typescript
   const USE_REAL_SDK = false;  // Currently defaults to mock
   ```

3. **Dependencies in `package.json:11-17`:**
   - `@anthropic-ai/claude-agent-sdk`: "^0.2.19" ✅ Correct real SDK
   - `@ai-sdk/anthropic`: "^3.0.23" (used by mock)
   - `@ai-sdk/openai`: "^3.0.13" (used by mock)
   - `ai`: "^6.0.42" (used by mock)

### Key Discoveries

- The real SDK (`@anthropic-ai/claude-agent-sdk`) is already installed and the `TaskController.ts` already uses it correctly via the `query()` function
- The `query()` function is confirmed as the correct entry point per official Anthropic documentation
- The mock `AISDKTaskController.ts` contains **simulated tool results** (lines 140-200) - NOT real tool execution
- The real SDK requires Claude Code CLI to be installed on the machine running the server

## Desired End State

After this plan is complete:
1. The example uses ONLY the real `@anthropic-ai/claude-agent-sdk`
2. All mock/simulated code is removed
3. The `USE_REAL_SDK` flag is removed (always uses real SDK)
4. The AI SDK dependencies are removed if no longer needed
5. Tool execution goes through the real Claude Agent SDK's built-in tools

### How to Verify

```bash
# The example should run and connect to real Claude Agent SDK
cd examples/agent-dashboard-mvp
ANTHROPIC_API_KEY=sk-xxx pnpm dev

# Creating a task should show real SDK events in console
# Tool calls should execute real operations (file reads, etc.)
```

## What We're NOT Doing

- Not changing the frontend components or UI
- Not modifying the `@assistant-ui/react-agent` package
- Not adding new features beyond switching to real SDK
- Not changing the SSE streaming mechanism

## Implementation Approach

The existing `TaskController.ts` already correctly uses the real SDK. The main changes are:
1. Remove the SDK selection flag and always use `TaskController`
2. Remove or archive the mock `AISDKTaskController.ts`
3. Clean up unused dependencies
4. Add proper environment variable documentation

## Phase 1: Enable Real SDK

### Overview
Switch from mock to real SDK by removing the selection flag.

### Changes Required

#### 1. Update API Route
**File**: `examples/agent-dashboard-mvp/app/api/agent/route.ts`
**Changes**: Remove USE_REAL_SDK flag and always use TaskController

```typescript
// REMOVE these lines (16-18):
// Use AI SDK for now (real Claude Agent SDK needs proper auth setup)
// To use the real SDK, set USE_REAL_SDK = true and ensure ANTHROPIC_API_KEY is valid
const USE_REAL_SDK = false;

// REMOVE the conditional (48-50):
const controller = USE_REAL_SDK
  ? new TaskController(taskId, options)
  : new AISDKTaskController(taskId, options);

// REPLACE with:
const controller = new TaskController(taskId, options);

// REMOVE AISDKTaskController import (line 13):
import { AISDKTaskController } from "./AISDKTaskController";

// UPDATE log message (line 57):
console.log(`[Task ${taskId}] Created with Claude Agent SDK`);
```

#### 2. Delete Mock Controller
**File**: `examples/agent-dashboard-mvp/app/api/agent/AISDKTaskController.ts`
**Changes**: Delete this file entirely - it contains only simulated/mock behavior

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `cd examples/agent-dashboard-mvp && pnpm build`
- [x] No lint errors: `pnpm lint`
- [x] AISDKTaskController.ts no longer exists

#### Manual Verification:
- [ ] Run `pnpm dev` and create a task
- [ ] Verify console shows "Created with Claude Agent SDK"
- [ ] Verify real tool calls appear (requires ANTHROPIC_API_KEY)

---

## Phase 2: Clean Up Dependencies

### Overview
Remove AI SDK dependencies that were only used by the mock implementation.

### Changes Required

#### 1. Update package.json
**File**: `examples/agent-dashboard-mvp/package.json`
**Changes**: Remove unused AI SDK packages

```json
// REMOVE these dependencies:
"@ai-sdk/anthropic": "^3.0.23",
"@ai-sdk/openai": "^3.0.13",
"ai": "^6.0.42",
```

#### 2. Clean lockfile
**Command**: `pnpm install` (will regenerate pnpm-lock.yaml)

### Success Criteria

#### Automated Verification:
- [x] `pnpm install` succeeds
- [x] `pnpm build` succeeds in examples/agent-dashboard-mvp
- [x] No references to `@ai-sdk/*` in examples/agent-dashboard-mvp

---

## Phase 3: Improve Environment Documentation

### Overview
Update documentation to clarify SDK requirements.

### Changes Required

#### 1. Update .env.example
**File**: `examples/agent-dashboard-mvp/.env.example`
**Changes**: Document required environment variables

```bash
# Required: Anthropic API key for Claude Agent SDK
ANTHROPIC_API_KEY=sk-ant-xxx

# Note: Claude Code CLI must be installed for the Agent SDK to work
# Install: npm install -g @anthropic-ai/claude-code
```

#### 2. Update route.ts comments
**File**: `examples/agent-dashboard-mvp/app/api/agent/route.ts`
**Changes**: Update header comment

```typescript
/**
 * API route for agent task management.
 * Handles creating tasks, approvals, and cancellations.
 *
 * Uses @anthropic-ai/claude-agent-sdk for streaming agent events.
 * Requires:
 * - ANTHROPIC_API_KEY environment variable
 * - Claude Code CLI installed (npm install -g @anthropic-ai/claude-code)
 */
```

### Success Criteria

#### Automated Verification:
- [x] Files exist and are properly formatted

#### Manual Verification:
- [x] .env.example has clear instructions
- [ ] Running without ANTHROPIC_API_KEY gives clear error message

---

## Testing Strategy

### Integration Tests (Manual):
1. Start the development server with valid ANTHROPIC_API_KEY
2. Create a task with a simple prompt like "What files are in this directory?"
3. Verify that:
   - Real tool calls are made (Read, Glob, etc.)
   - Tool approval flow works
   - Events stream correctly to the UI
   - Cost information is captured

### Edge Cases to Test:
- [ ] Missing ANTHROPIC_API_KEY - should fail gracefully with clear error
- [ ] Task cancellation - should properly abort SDK query
- [ ] Tool denial - should communicate denial back to SDK

## Performance Considerations

The real SDK spawns a Claude Code process, which may:
- Have higher memory usage than the mock
- Require Claude Code CLI to be installed
- Have network latency to Anthropic API

## References

- Real SDK location: `node_modules/@anthropic-ai/claude-agent-sdk`
- SDK documentation: https://platform.claude.com/docs/en/agent-sdk/typescript
- Current TaskController: `examples/agent-dashboard-mvp/app/api/agent/TaskController.ts`
