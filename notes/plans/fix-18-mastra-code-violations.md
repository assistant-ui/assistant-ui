# Fix 18 Code Violations in Mastra Integration - Implementation Plan

## Overview

This plan addresses 18 code violations identified in the Mastra integration, spanning ESM/CommonJS conflicts, error handling gaps, React state management issues, logic bugs, test anti-patterns, and documentation gaps. All violations have been thoroughly analyzed with root causes documented in `notes/research/mastra-code-violations-root-cause-analysis.md`.

## Current State Analysis

**Violations by Category**:
1. **ESM/CommonJS Conflicts (7)**: Code uses CommonJS patterns (`__dirname`, `require()`) in packages configured as pure ESM
2. **API Error Handling (2)**: Missing input validation causes 400 errors to be misclassified as 500
3. **React State Closure (1)**: Stale state in async callbacks causes data loss during workflow resume
4. **Logic Bugs (4)**: Missing variable captures, incorrect conditions, wrong data structure assumptions
5. **Test Anti-patterns (4)**: Global mock pollution and incorrect test assertions
6. **Documentation (1)**: Incomplete code example missing required setup

**Key Discoveries**:
- Both `packages/cli` and `packages/react-mastra` have `"type": "module"` making all files ESM (packages/cli/package.json:17, packages/react-mastra/package.json:5)
- `packages/react-mastra/vitest.config.ts:3-5` already shows the correct ESM pattern to follow
- `examples/with-mastra/app/api/workflow/route.ts:8-16` demonstrates proper input validation pattern
- React functional setState pattern needed for async callbacks that capture state

## Desired End State

After this plan is complete:
- All files use proper ESM patterns (no `__dirname`, `require()`, or raw pathname access)
- API routes correctly classify errors (400 for client errors, 500 for server errors)
- React state updates work correctly in async contexts without data loss
- All logic bugs fixed with proper variable captures and type-aware conditions
- Tests use centralized mocks without pollution
- Documentation examples are complete and copy-paste ready

### Verification:
- `pnpm build` succeeds across all packages
- `pnpm test` passes all test suites
- No `ReferenceError` when running code on Windows or with spaces in paths
- API returns correct HTTP status codes for malformed input
- Workflow resume preserves context data correctly
- Tests run in isolation without affecting each other

## What We're NOT Doing

- Not refactoring the entire module system (only fixing violations)
- Not changing test frameworks or tools (keeping Vitest)
- Not rewriting API error handling architecture (just adding validation layers)
- Not migrating to a different React state management library
- Not adding new features beyond fixing the identified bugs

## Implementation Approach

Execute fixes in dependency order:
1. **Phase 1**: ESM fixes first (enables builds and tests to run)
2. **Phase 2**: Test fixes (ensures accurate verification of subsequent fixes)
3. **Phase 3**: API error handling (fixes user-facing behavior)
4. **Phase 4**: React state management (fixes critical data loss bug)
5. **Phase 5**: Logic bugs (fixes remaining incorrect behavior)
6. **Phase 6**: Documentation (final polish)

Each phase is independently testable and reversible.

---

## Phase 1: ESM/CommonJS Pattern Fixes

### Overview
Fix 7 violations where code uses CommonJS patterns in ES modules, causing `ReferenceError`s and path resolution failures.

### Changes Required:

#### 1.1 Fix Percent-Encoded File Paths
**File**: `packages/cli/src/commands/add.ts`
**Lines**: 74-77

**Current Code**:
```typescript
const mastraRegistryPath = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../components/mastra-registry.json",
);
```

**Changes**:
1. Add import at top of file:
```typescript
import { fileURLToPath } from "url";
```

2. Replace lines 74-77:
```typescript
const mastraRegistryPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../components/mastra-registry.json",
);
```

**Why**: `fileURLToPath()` properly decodes percent-encoding (`%20` → space) and handles Windows paths (`/C:/` → `C:\`).

---

#### 1.2 Fix vitest.memory.config.ts __dirname
**File**: `packages/react-mastra/vitest.memory.config.ts`
**Lines**: 1-3, 35

**Current Code**:
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  // ...
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),  // Line 35 - __dirname undefined
    },
  },
});
```

**Changes**:
1. Add imports at top (lines 1-3):
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
```

2. Line 35 unchanged (now __dirname is defined)

**Why**: ES modules don't have `__dirname`; derive it from `import.meta.url`.

---

#### 1.3 Fix vitest.integration.config.ts __dirname
**File**: `packages/react-mastra/vitest.integration.config.ts`
**Lines**: 1-3, 13

**Current Code**:
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  // ...
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),  // Line 13 - __dirname undefined
    },
  },
});
```

**Changes**:
1. Add imports at top (lines 1-3):
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
```

2. Line 13 unchanged (now __dirname is defined)

---

#### 1.4 Fix vitest.performance.config.ts __dirname
**File**: `packages/react-mastra/vitest.performance.config.ts`
**Lines**: 1-3, 13

**Current Code**:
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  // ...
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),  // Line 13 - __dirname undefined
    },
  },
});
```

**Changes**:
1. Add imports at top (lines 1-3):
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
```

2. Line 13 unchanged (now __dirname is defined)

---

#### 1.5 Fix Windows Path Comparison
**File**: `packages/react-mastra/scripts/quality-gates.mjs`
**Lines**: 1-3, 144-149

**Current Code**:
```javascript
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ... later ...

// Line 144
if (import.meta.url === `file://${process.argv[1]}`) {
  runQualityGates().catch((error) => {
    console.error("Quality gates script failed:", error);
    process.exit(1);
  });
}
```

**Changes**:
1. Add imports at top:
```javascript
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
```

2. Replace lines 144-149:
```javascript
// Convert both to file paths for cross-platform comparison
const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = resolve(process.argv[1]);

if (currentFilePath === executedFilePath) {
  runQualityGates().catch((error) => {
    console.error("Quality gates script failed:", error);
    process.exit(1);
  });
}
```

**Why**: String concatenation with `file://` creates invalid URLs on Windows. Compare as file paths instead.

---

#### 1.6 Fix ESM-only Module Import in Template
**File**: `packages/cli/src/templates/mastra-template.ts`
**Lines**: 716-772

**Current Code** (line 720 in template string):
```typescript
const markdownText = `import { MessagePrimitive } from "@assistant-ui/react";
import { memo } from "react";

const remarkGfm = require("remark-gfm");  // Line 720 - require() in ESM context

const MarkdownText = memo(() => {
  // ...
});
```

**Changes**:
Replace the template string to use ESM import:
```typescript
const markdownText = `import { MessagePrimitive } from "@assistant-ui/react";
import { memo } from "react";
import remarkGfm from "remark-gfm";  // Changed to ESM import

const MarkdownText = memo(() => {
  return (
    <MessagePrimitive.Text
      components={{
        // ... component config
      }}
      remarkPlugins={[remarkGfm]}
    />
  );
});

MarkdownText.displayName = "MarkdownText";

export { MarkdownText };
`;
```

**Why**: `remark-gfm` is ESM-only and throws `ERR_REQUIRE_ESM` with `require()`.

---

### Success Criteria:

#### Automated Verification:
- [x] All packages build successfully: `pnpm build` - CLI and react-mastra packages build successfully
- [ ] No ReferenceError for `__dirname`: `pnpm test` - Will verify with tests
- [ ] CLI can find registry in paths with spaces: Manual test with space in path
- [ ] Quality gates script runs: `cd packages/react-mastra && node scripts/quality-gates.mjs`
- [ ] Generated template compiles: Create test project with `pnpm create assistant-ui` and build it

#### Manual Verification:
- [ ] Test on Windows machine (if available) to verify path handling
- [ ] Create directory with spaces and run CLI from there
- [ ] Verify quality gates script executes when run directly vs imported
- [ ] Generate new project and verify remark-gfm imports correctly

---

## Phase 2: API Error Handling & Validation

### Overview
Fix 2 violations where missing input validation causes client errors (400) to be misclassified as server errors (500).

### Changes Required:

#### 2.1 Add Input Validation to Resume Route
**File**: `examples/with-mastra/app/api/workflow/resume/route.ts`
**Lines**: 4-12

**Current Code**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, stepId, resumeData } = body;

    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }
    // ...
```

**Changes**:
Replace lines 5-7 with two-layer validation:
```typescript
export async function POST(request: NextRequest) {
  try {
    let body;

    // Layer 1: JSON parsing (return 400 for syntax errors)
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON", details: "Request body is not valid JSON" },
        { status: 400 }
      );
    }

    // Layer 2: Structure validation (return 400 for wrong types)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: "Expected a JSON object",
        },
        { status: 400 }
      );
    }

    const { runId, stepId, resumeData } = body;

    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }
    // ... rest of function
```

**Why**: Separates client errors (malformed JSON, wrong structure) from server errors.

---

#### 2.2 Add JSON Parse Error Handling to Workflow Route
**File**: `examples/with-mastra/app/api/workflow/route.ts`
**Lines**: 4-6, 61-70

**Current Code**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Guard against non-object payloads
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      // ...
    }
    // ... business logic
  } catch (error) {
    console.error("Workflow API error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
```

**Changes**:
1. Replace lines 5-6 with separate JSON parsing:
```typescript
export async function POST(request: NextRequest) {
  try {
    let body;

    // Layer 1: JSON parsing (return 400 for syntax errors)
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON", details: "Request body is not valid JSON" },
        { status: 400 }
      );
    }

    // Layer 2: Structure validation (existing code)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: "Expected a JSON object",
        },
        { status: 400 },
      );
    }

    // ... rest of business logic
  } catch (error) {
    // Now only catches server errors (500)
    console.error("Workflow API error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
```

**Why**: JSON parsing errors are client mistakes (400), not server failures (500).

---

### Success Criteria:

#### Automated Verification:
- [ ] API returns 400 for malformed JSON: `curl -X POST http://localhost:3000/api/workflow -H "Content-Type: application/json" -d '{invalid' | grep 400`
- [ ] API returns 400 for null body: `curl -X POST http://localhost:3000/api/workflow -H "Content-Type: application/json" -d 'null' | grep 400`
- [ ] API returns 400 for array body: `curl -X POST http://localhost:3000/api/workflow -H "Content-Type: application/json" -d '[]' | grep 400`
- [ ] API returns 400 for missing runId: `curl -X POST http://localhost:3000/api/workflow/resume -H "Content-Type: application/json" -d '{}' | grep 400`
- [ ] API returns 500 for actual server errors: Trigger workflow error and verify 500 response

#### Manual Verification:
- [ ] Test with various malformed payloads and verify 400 responses with helpful error messages
- [ ] Test with valid payloads and verify 200 responses
- [ ] Verify error logs show clear distinction between client and server errors
- [ ] Check that monitoring/alerting only fires for 500 errors, not 400s

---

## Phase 3: React State Management Fix

### Overview
Fix 1 critical violation where async callback captures stale state, causing data loss during workflow resume operations.

### Changes Required:

#### 3.1 Use Functional setState in Workflow Event Handler
**File**: `packages/react-mastra/src/useMastraWorkflows.ts`
**Lines**: 380-422, 424-439, 441-457

**Current Code**:
```typescript
useEffect(() => {
  if (!workflowState) return;

  const handleWorkflowEvent = (event: { ... }) => {
    switch (event.type) {
      case "workflow-state-update": {
        // Line 384: Spreads stale workflowState
        const updatedState: MastraWorkflowState = {
          ...workflowState,
          current: event.data.currentStep,
          status: event.data.status,
          timestamp: event.timestamp,
        };

        // Lines 391-408: More stale state usage
        if (event.data.suspended && event.data.steps) {
          updatedState.interrupt = {
            id: workflowState.id,  // Stale
            // ...
          };
        }

        setWorkflowState(updatedState);  // Line 412
        // ...
      }

      case "workflow-complete": {
        const completedState: MastraWorkflowState = {
          ...workflowState,  // Line 427: Stale
          status: "completed",
          timestamp: event.timestamp,
        };
        setWorkflowState(completedState);  // Line 432
      }

      case "error": {
        const errorState: MastraWorkflowState = {
          ...workflowState,  // Line 445: Stale
          status: "error",
          timestamp: event.timestamp,
        };
        setWorkflowState(errorState);  // Line 450
      }
    }
  };

  const unsubscribe = mastraWorkflow.subscribe(
    workflowState.id,
    handleWorkflowEvent,
    (error) => {
      const errorState: MastraWorkflowState = {
        ...workflowState,  // Line 474: Stale
        status: "error",
        timestamp: new Date().toISOString(),
      };
      setWorkflowState(errorState);  // Line 478
    },
  );

  return () => unsubscribe();
}, [workflowState?.id, config]);
```

**Changes**:
Replace all `setWorkflowState()` calls with functional form to read current state:

```typescript
useEffect(() => {
  if (!workflowState) return;

  const handleWorkflowEvent = (event: { ... }) => {
    switch (event.type) {
      case "workflow-state-update": {
        // Use functional setState to get current state
        setWorkflowState((currentState) => {
          if (!currentState) return currentState;

          const updatedState: MastraWorkflowState = {
            ...currentState,  // Always current, never stale
            current: event.data.currentStep,
            status: event.data.status,
            timestamp: event.timestamp,
          };

          // Check if suspended and add interrupt data
          if (event.data.suspended && event.data.steps) {
            const suspendedStep = event.data.steps[event.data.currentStep];
            if (suspendedStep?.result) {
              updatedState.interrupt = {
                id: currentState.id,  // Current state
                state: event.data.currentStep,
                context: suspendedStep.result,
                requiresInput: true,
                prompt:
                  event.data.currentStep === "screening-step"
                    ? "Should we proceed with this candidate to interview?"
                    : "What is your hiring decision?",
                allowedActions:
                  event.data.currentStep === "screening-step"
                    ? ["approve", "reject"]
                    : ["hire", "reject", "second_interview"],
              };
            }
          }

          return updatedState;
        });

        // Update local flags based on current state
        setWorkflowState((currentState) => {
          if (!currentState) return currentState;
          setIsSuspended(event.data.suspended);
          setIsRunning(
            !event.data.suspended && event.data.status === "running",
          );
          return currentState;
        });

        // Call config callback with the updated state
        setWorkflowState((currentState) => {
          if (currentState) {
            config.onStateChange?.(currentState);
          }
          return currentState;
        });

        break;
      }

      case "workflow-complete": {
        setWorkflowState((currentState) => {
          if (!currentState) return currentState;

          const completedState: MastraWorkflowState = {
            ...currentState,  // Current state
            status: "completed",
            timestamp: event.timestamp,
          };

          setIsRunning(false);
          setIsSuspended(false);
          config.onStateChange?.(completedState);

          return completedState;
        });

        break;
      }

      case "error": {
        console.error("Workflow error event:", event.data);
        setWorkflowState((currentState) => {
          if (!currentState) return currentState;

          const errorState: MastraWorkflowState = {
            ...currentState,  // Current state
            status: "error",
            timestamp: event.timestamp,
          };

          setIsRunning(false);
          setIsSuspended(false);
          config.onStateChange?.(errorState);

          return errorState;
        });

        break;
      }

      default:
        break;
    }
  };

  const unsubscribe = mastraWorkflow.subscribe(
    workflowState.id,
    handleWorkflowEvent,
    (error) => {
      console.error("Workflow subscription error:", error);
      config.onError?.(error);

      setWorkflowState((currentState) => {
        if (!currentState) return currentState;

        const errorState: MastraWorkflowState = {
          ...currentState,  // Current state
          status: "error",
          timestamp: new Date().toISOString(),
        };

        setIsRunning(false);
        setIsSuspended(false);

        return errorState;
      });
    },
  );

  return () => unsubscribe();
}, [workflowState?.id, config]);
```

**Why**: Functional setState provides current state at execution time, preventing stale closures from overwriting recent updates.

---

### Success Criteria:

#### Automated Verification:
- [ ] Unit tests pass: `cd packages/react-mastra && pnpm test useMastraWorkflows`
- [ ] Type checking passes: `cd packages/react-mastra && pnpm typecheck`
- [ ] Integration tests pass: `cd packages/react-mastra && pnpm test:integration`

#### Manual Verification:
- [ ] Start workflow with example app: `cd examples/with-mastra && pnpm dev`
- [ ] Trigger workflow suspend
- [ ] Add resume data via resume form
- [ ] Resume workflow
- [ ] Verify resume data persists in workflow state (check browser dev tools)
- [ ] Verify context updates aren't lost between suspend and resume cycles
- [ ] Test multiple rapid suspend/resume cycles to ensure no state corruption

---

## Phase 4: Logic Bug Fixes

### Overview
Fix 4 violations involving missing variable captures, incorrect conditions, and wrong data structure assumptions.

### Changes Required:

#### 4.1 Capture Timeout ID for Cancel
**File**: `packages/react-mastra/src/adapters/transformAdapters.ts`
**Lines**: 117-149

**Current Code**:
```typescript
speak(text) {
  let currentStatus: SpeechSynthesisAdapter.Status = { type: "starting" };
  const listeners = new Set<() => void>();

  config.onStart?.();

  // Line 125: timeout ID not captured
  setTimeout(() => {
    currentStatus = { type: "ended", reason: "finished" };
    listeners.forEach((listener) => listener());
    config.onStop?.();
  }, text.length * 50);

  return {
    get status() {
      return currentStatus;
    },
    cancel() {
      if (currentStatus.type !== "ended") {
        currentStatus = { type: "ended", reason: "cancelled" };
        listeners.forEach((listener) => listener());
        config.onStop?.();  // Called, but timeout still fires
      }
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
```

**Changes**:
```typescript
speak(text) {
  let currentStatus: SpeechSynthesisAdapter.Status = { type: "starting" };
  const listeners = new Set<() => void>();

  config.onStart?.();

  // Capture timeout ID so it can be cleared
  const timeoutId = setTimeout(() => {
    // Guard against race condition
    if (currentStatus.type !== "ended") {
      currentStatus = { type: "ended", reason: "finished" };
      listeners.forEach((listener) => listener());
      config.onStop?.();
    }
  }, text.length * 50);

  return {
    get status() {
      return currentStatus;
    },
    cancel() {
      if (currentStatus.type !== "ended") {
        clearTimeout(timeoutId);  // CRITICAL: Clear the pending timeout
        currentStatus = { type: "ended", reason: "cancelled" };
        listeners.forEach((listener) => listener());
        config.onStop?.();
      }
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
```

**Why**: Without clearing the timeout, it fires after cancel and calls `onStop()` twice.

---

#### 4.2 Fix Text Merge Logic
**File**: `packages/react-mastra/src/appendMastraChunk.ts`
**Lines**: 75-94

**Current Code**:
```typescript
for (const currPart of currArray) {
  if (currPart.type === "text") {
    // Line 78: finds LAST text, even if separated by tool calls
    const existingTextIndex = mergedContent.findLastIndex(
      (part) => part.type === "text",
    );

    if (
      existingTextIndex >= 0 &&
      mergedContent[existingTextIndex]?.type === "text"
    ) {
      // Merge text content
      mergedContent[existingTextIndex] = {
        type: "text",
        text: (mergedContent[existingTextIndex] as any).text + currPart.text,
      };
    } else {
      mergedContent.push(currPart);
    }
  } else if (currPart.type === "tool_call") {
    // ... tool call handling
  }
}
```

**Changes**:
```typescript
for (const currPart of currArray) {
  if (currPart.type === "text") {
    // Only merge if the LAST element is text (adjacent)
    const lastIndex = mergedContent.length - 1;
    const lastPart = mergedContent[lastIndex];

    if (lastPart?.type === "text") {
      // Adjacent text - merge it
      mergedContent[lastIndex] = {
        type: "text",
        text: lastPart.text + currPart.text,
      };
    } else {
      // Not adjacent - append new text block
      mergedContent.push(currPart);
    }
  } else if (currPart.type === "tool_call") {
    // ... tool call handling unchanged
  }
}
```

**Why**: Text should only merge with adjacent text. `findLastIndex` incorrectly merges across tool calls, moving text before them.

---

#### 4.3 Fix Tool Error Condition
**File**: `examples/with-mastra/components/assistant-ui/tool-fallback.tsx`
**Lines**: 14

**Current Code**:
```typescript
const isError = status.type === "incomplete" && status.reason === "error";
```

**Changes**:
```typescript
// Tool calls use string status, not object
const isError =
  status === "output-error" ||
  (typeof status === "object" && status.type === "output-error");
```

**Why**: Tool calls have string status `"output-error"`, not object `{ type: "incomplete", reason: "error" }`.

---

#### 4.4 Fix Exports Validation
**File**: `packages/react-mastra/scripts/validate-production-build.mts`
**Lines**: 87-94

**Current Code**:
```typescript
if (!packageJson.main && !packageJson.exports?.["."]) {
  result.errors.push("No main export defined in package.json");
  result.success = false;
}
```

**Changes**:
```typescript
const hasMainExport = !!packageJson.main;
const hasDefaultExport = !!packageJson.exports?.["."];
const hasAnyExport =
  !!packageJson.exports &&
  Object.keys(packageJson.exports).length > 0;

if (!hasMainExport && !hasDefaultExport && !hasAnyExport) {
  result.errors.push("No exports defined in package.json");
  result.success = false;
} else if (!hasMainExport && !hasDefaultExport) {
  result.warnings.push(
    "No default (.) export - package is not directly importable, only subpaths"
  );
}
```

**Why**: Packages with only subpath exports (e.g., `./runtime`) are valid but were rejected as errors.

---

### Success Criteria:

#### Automated Verification:
- [ ] Unit tests pass: `cd packages/react-mastra && pnpm test`
- [ ] Build validation succeeds: `cd packages/react-mastra && node scripts/validate-production-build.mts`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Test speech cancel doesn't call onStop twice (check console for duplicate calls)
- [ ] Test message streaming with tool calls maintains correct text order
- [ ] Test tool error rendering shows error UI (trigger tool failure and verify red border/message)
- [ ] Test package with subpath-only exports passes validation without errors

---

## Phase 5: Test Setup & Assertion Fixes

### Overview
Fix 4 violations in test setup that cause mock pollution and incorrect test assertions.

### Changes Required:

#### 5.1 Fix Global Fetch Mock Restoration
**File**: `packages/react-mastra/tests/integration/mastra-integration.test.ts`
**Lines**: 1, 8, 16-19

**Current Code**:
```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
// ...

// Line 8: Direct assignment, never restored
global.fetch = vi.fn();

describe("Mastra Integration Tests", () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();  // Doesn't restore direct assignments
  });
});
```

**Changes**:
```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
// ...

// Preserve original fetch
const originalFetch = global.fetch;

describe("Mastra Integration Tests", () => {
  beforeAll(() => {
    // Mock fetch in beforeAll instead of module scope
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Explicitly restore original fetch
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });
});
```

**Alternative using vi.spyOn (preferred)**:
```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
// ...

let fetchSpy: any;

describe("Mastra Integration Tests", () => {
  beforeAll(() => {
    // Use spyOn so vi.restoreAllMocks() works correctly
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(vi.fn());
  });

  afterAll(() => {
    fetchSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
```

**Why**: Direct assignments to globals persist across test files; must be explicitly restored or use `vi.spyOn()`.

---

#### 5.2 Fix Performance Object Mock
**File**: `packages/react-mastra/src/testSetup.ts`
**Lines**: 129-137, 155-162

**Current Code**:
```typescript
// Line 129-137
const originalPerformance = global.performance;
global.performance = Object.create(originalPerformance, {
  now: {
    value: vi.fn(() => Date.now()),
    writable: true,
    configurable: true,
  },
});

// Line 155-162: beforeEach doesn't restore performance
beforeEach(() => {
  vi.clearAllMocks();
  // ... other cleanup
});
```

**Changes**:
```typescript
// Line 129-137: Remove Object.create approach entirely

// Line 155-162: Add performance.now spy in beforeEach
let performanceNowSpy: any;

beforeEach(() => {
  vi.clearAllMocks();

  // Mock only performance.now, preserve native object
  performanceNowSpy = vi.spyOn(performance, 'now').mockReturnValue(Date.now());

  // Reset fetch mock
  if (global.fetch) {
    (global.fetch as any).mockClear();
  }
});

afterEach(() => {
  // Restore performance.now spy
  if (performanceNowSpy) {
    performanceNowSpy.mockRestore();
  }

  // Restore any timers
  vi.clearAllTimers();
  vi.useRealTimers();

  // Restore mocks
  vi.restoreAllMocks();

  // Clear module cache to prevent memory leaks
  vi.resetModules();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});
```

**Why**: `Object.create()` strips internal slots needed by native performance methods. Use `vi.spyOn()` to mock individual methods.

---

#### 5.3 Fix Unreachable Test Case
**File**: `packages/react-mastra/src/useMastraMessages.test.ts`
**Lines**: 25-34

**Current Code**:
```typescript
it("should generate IDs for messages without them", () => {
  const message = createMockMastraMessage({
    /* id intentionally omitted */
  });
  const result = accumulator.addMessages([message]);

  expect(result).toHaveLength(1);
  expect(result[0].id).toBeDefined();
  expect(typeof result[0].id).toBe("string");
});
```

**Changes**:
```typescript
it("should generate IDs for messages without them", () => {
  const message = createMockMastraMessage({
    id: undefined  // Explicitly override default ID
  });
  const result = accumulator.addMessages([message]);

  expect(result).toHaveLength(1);
  expect(result[0].id).toBeDefined();
  expect(result[0].id).not.toBe("mastra-test-id");  // Should be generated UUID
  expect(typeof result[0].id).toBe("string");
  // Verify it's a UUID format
  expect(result[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
```

**Why**: Factory provides default ID that prevents testing the ID generation path. Must explicitly pass `undefined`.

---

#### 5.4 Fix act() Return Value Usage
**File**: `packages/react-mastra/src/useMastraWorkflows.test.ts`
**Lines**: 93-103

**Current Code**:
```typescript
// Line 94-96
const workflow = await act(async () => {
  return await result.current.startWorkflow({ initialData: "test" });
});

// Line 98-103
expect(workflow).toBeDefined();
expect(workflow.id).toMatch(/mock-workflow-id/);
expect(workflow.status).toBe("running");
```

**Changes**:
```typescript
// Capture return value inside act() callback
let workflow: any;
await act(async () => {
  workflow = await result.current.startWorkflow({ initialData: "test" });
});

// Now workflow has the actual return value
expect(workflow).toBeDefined();
expect(workflow.id).toMatch(/mock-workflow-id/);
expect(workflow.status).toBe("running");
expect(result.current.isRunning).toBe(true);
expect(result.current.workflowState?.status).toBe("running");
```

**Why**: `act()` returns `Promise<void>`, not the callback's return value. Must capture in outer variable.

---

### Success Criteria:

#### Automated Verification:
- [ ] All unit tests pass: `cd packages/react-mastra && pnpm test`
- [ ] Integration tests pass in isolation: `cd packages/react-mastra && pnpm test:integration`
- [ ] Run tests multiple times to verify no pollution: `for i in {1..5}; do pnpm test; done`
- [ ] Performance tests run successfully: `cd packages/react-mastra && pnpm test:performance`
- [ ] Memory tests run successfully: `cd packages/react-mastra && pnpm test -- --config vitest.memory.config.ts`

#### Manual Verification:
- [ ] Verify fetch mock doesn't leak across test files (check test output for unexpected mock behavior)
- [ ] Verify performance.mark() and performance.measure() work in tests (add test calls and verify no errors)
- [ ] Verify ID generation test actually exercises ensureMessageId() (add breakpoint or console.log)
- [ ] Verify act() test correctly captures workflow object (check assertion values)

---

## Phase 6: Documentation Fix

### Overview
Fix 1 violation where README example is missing required initialization code.

### Changes Required:

#### 6.1 Add OpenAI Client Initialization to README
**File**: `examples/with-mastra/README.md`
**Lines**: 179-199

**Current Code**:
```markdown
### Agent Definition

```typescript
import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";

const screeningAgent = new Agent({
  name: "screeningAgent",
  instructions:
    "You are a professional recruiter specializing in candidate screening...",
  model: openai("gpt-4o-mini"),  // Line 189 - openai is not defined
  memory: true,
});

const interviewAgent = new Agent({
  name: "interviewAgent",
  instructions: "You are an experienced technical interviewer...",
  model: openai("gpt-4o-mini"),  // Line 196 - openai is not defined
  memory: true,
});
```
\```
```

**Changes**:
```markdown
### Agent Definition

```typescript
import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";

// Initialize the OpenAI client
const openai = createOpenAI({
  apiKey: process.env["OPENAI_API_KEY"] || "",
});

const screeningAgent = new Agent({
  name: "screeningAgent",
  instructions:
    "You are a professional recruiter specializing in candidate screening...",
  model: openai("gpt-4o-mini"),
  memory: true,
});

const interviewAgent = new Agent({
  name: "interviewAgent",
  instructions: "You are an experienced technical interviewer...",
  model: openai("gpt-4o-mini"),
  memory: true,
});
```
\```
```

**Why**: The `openai()` function requires an initialized client. Missing initialization causes `ReferenceError` when users copy the example.

---

### Success Criteria:

#### Automated Verification:
- [ ] README renders correctly in GitHub: Push and view on GitHub
- [ ] Code blocks have valid syntax highlighting: Check markdown preview
- [ ] Links in README are valid: Run markdown link checker

#### Manual Verification:
- [ ] Copy example code and verify it runs without ReferenceError
- [ ] Create new agent following README and verify successful initialization
- [ ] Verify example matches actual implementation in `examples/with-mastra/mastra/agents/screeningAgent.ts:6-8`

---

## Testing Strategy

### Unit Tests
Run after each phase to ensure changes don't break existing functionality:
```bash
cd packages/react-mastra && pnpm test
cd packages/cli && pnpm test
```

### Integration Tests
Run after Phases 2, 3, and 5:
```bash
cd packages/react-mastra && pnpm test:integration
cd examples/with-mastra && pnpm build && pnpm start
```

### Manual Testing Steps

**Phase 1 (ESM) Manual Tests**:
1. Create directory with spaces: `mkdir "test space"`
2. Run CLI from that directory: `cd "test space" && npx assistant-ui add`
3. Verify no path resolution errors

**Phase 2 (API) Manual Tests**:
1. Start example app: `cd examples/with-mastra && pnpm dev`
2. Send malformed JSON to API: `curl -X POST http://localhost:3000/api/workflow -d '{invalid'`
3. Verify 400 response with helpful error message
4. Send valid request and verify 200 response

**Phase 3 (React State) Manual Tests**:
1. Start example app with workflow
2. Start workflow → suspend → add resume data → resume
3. Check browser dev tools to verify resume data persists in state
4. Repeat multiple times to ensure no data loss

**Phase 4 (Logic Bugs) Manual Tests**:
1. Test speech adapter cancel doesn't double-call onStop
2. Stream messages with tool calls and verify text order
3. Trigger tool error and verify error UI appears
4. Run build validation script and verify warnings vs errors

**Phase 5 (Tests) Manual Tests**:
1. Run tests multiple times: `for i in {1..5}; do pnpm test; done`
2. Verify consistent results (no flaky failures from mock pollution)
3. Check test coverage to ensure ID generation path is tested

**Phase 6 (Documentation) Manual Tests**:
1. Copy README agent example to new file
2. Run it and verify no ReferenceError
3. Verify agent initializes successfully

### Regression Testing
After all phases complete:
```bash
# Full build
pnpm build

# All tests
pnpm test

# Integration tests
cd packages/react-mastra && pnpm test:integration

# Example app
cd examples/with-mastra && pnpm build && pnpm dev
```

### Performance Verification
Ensure fixes don't impact performance:
```bash
cd packages/react-mastra && pnpm test:performance
```

---

## Performance Considerations

- **ESM fixes**: No performance impact (path resolution at module load time)
- **API validation**: Minimal overhead (~1ms per request for validation)
- **React state**: Functional setState has negligible overhead vs direct setState
- **Logic bugs**: Timeout clearing improves performance (prevents unnecessary callbacks)
- **Test fixes**: Improves test performance by reducing mock overhead

---

## Migration Notes

**No migration needed** - these are bug fixes, not feature changes:
- ESM changes are transparent to users (same APIs)
- API changes only affect error responses (400 vs 500)
- React state fix preserves existing behavior (just fixes data loss bug)
- Logic bug fixes correct behavior without API changes
- Test fixes are internal only
- Documentation fix doesn't change code behavior

---

## Rollback Strategy

Each phase can be rolled back independently:

1. **Phase 1**: `git revert <commit>` - restores old path handling
2. **Phase 2**: `git revert <commit>` - restores 500 for all errors
3. **Phase 3**: `git revert <commit>` - restores direct setState (with data loss bug)
4. **Phase 4**: `git revert <commit>` - restores old logic (with bugs)
5. **Phase 5**: `git revert <commit>` - restores old test setup
6. **Phase 6**: `git revert <commit>` - restores incomplete README example

---

## References

- **Original analysis**: `notes/research/mastra-code-violations-root-cause-analysis.md`
- **ESM pattern example**: `packages/react-mastra/vitest.config.ts:3-5`
- **Validation pattern example**: `examples/with-mastra/app/api/workflow/route.ts:8-16`
- **Agent initialization example**: `examples/with-mastra/mastra/agents/screeningAgent.ts:6-8`
- **Test setup reference**: `packages/react-mastra/src/testSetup.ts:121-162`

---

## Implementation Order Summary

1. ✅ **Phase 1**: ESM fixes → Enables builds
2. ✅ **Phase 2**: Test fixes → Ensures accurate verification
3. ✅ **Phase 3**: API fixes → Fixes user-facing errors
4. ✅ **Phase 4**: React state → Fixes critical data loss
5. ✅ **Phase 5**: Logic bugs → Fixes remaining issues
6. ✅ **Phase 6**: Documentation → Final polish

Each phase builds on the previous and can be tested independently.
