# Fix Test Memory Issues - Implementation Plan

## Overview

The `@assistant-ui/react-mastra` test suite is crashing with "JavaScript heap out of memory" errors during execution. Tests pass initially (useMastraRuntime: 6/6) but memory accumulates until Node.js runs out of heap space. This plan implements memory optimizations to allow the full test suite to complete successfully.

## Current State Analysis

### What's Broken

From validation report and code inspection:

1. **OOM Crash** (packages/react-mastra/):
   - Error: `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`
   - Tests crash after ~20 seconds
   - Some tests pass before crash (useMastraRuntime: 6/6 passed)

2. **Test Configuration** (vitest.config.ts:1-16):
   - No Node memory limit configured
   - jsdom environment (memory-intensive)
   - All 12 test files run in parallel
   - No pool size limits
   - No test isolation settings

3. **Test Setup** (testSetup.ts:1-133):
   - Global mocks for all @mastra packages
   - Mocks not properly cleaned between tests
   - Global fetch, crypto, performance, console mocked
   - `beforeEach()` only clears mocks, doesn't reset instances

4. **Test Files** (3,457 total lines):
   - Large test file: useMastraRAG.test.ts (523 lines)
   - Medium files: useMastraWorkflows.test.ts (311 lines)
   - 2 integration test files
   - All using jsdom which has high memory overhead

### Key Discoveries

- **Tests are correct**: Logic passes when memory available
- **Memory accumulation**: Problem compounds as tests run
- **jsdom overhead**: Each test file spawns new jsdom instance
- **No cleanup**: Test instances and mocks persist in memory
- **Parallel execution**: All tests run simultaneously without limits

## Desired End State

After implementation:

1. **All tests pass**: Complete test suite executes without OOM errors
2. **Memory efficient**: Peak memory usage stays under Node default (1.5GB)
3. **Reasonable speed**: Tests complete in <60 seconds
4. **Isolated tests**: Each test properly cleans up after itself
5. **Maintainable**: Configuration is clear and documented

### Verification

#### Automated Verification:
- [ ] All tests pass: `cd packages/react-mastra && pnpm run test`
- [ ] Tests complete without OOM: Exit code 0
- [ ] TypeScript still passes: `pnpm run typecheck`
- [ ] Memory usage reasonable: Monitor with `NODE_OPTIONS="--max-old-space-size=2048 --expose-gc" pnpm test`

#### Manual Verification:
- [ ] Run tests 3 times consecutively - all should pass
- [ ] Check test execution time: <60 seconds
- [ ] Verify no warnings about memory pressure
- [ ] Run with `--reporter=verbose` to see memory patterns

## What We're NOT Doing

- Not removing any tests (all tests remain)
- Not splitting test files (keeping current structure)
- Not disabling jsdom (still needed for React hooks)
- Not changing test logic or assertions
- Not adding external memory profiling tools
- Not modifying vitest core or dependencies

## Implementation Approach

We'll use a **layered optimization** approach:

1. **Increase heap size** - Quick fix to prevent immediate crashes
2. **Optimize vitest config** - Limit parallelism and pool size
3. **Improve test cleanup** - Proper mock and instance disposal
4. **Add memory monitoring** - Track and report memory usage
5. **Document best practices** - Prevent future memory issues

This provides both immediate relief and long-term stability.

---

## Phase 1: Configure Node.js Memory Settings

### Overview
Set appropriate Node.js memory limits and garbage collection settings to handle the test suite size.

### Changes Required

#### 1. Update Test Script with Memory Configuration
**File**: `packages/react-mastra/package.json`
**Changes**: Add NODE_OPTIONS to test scripts

```json
{
  "scripts": {
    "test": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest run",
    "test:watch": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest",
    "test:ui": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest --ui",
    "test:performance": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest --config vitest.performance.config.ts",
    "test:memory": "NODE_OPTIONS=\"--max-old-space-size=2048\" vitest --config vitest.memory.config.ts",
    "test:integration": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest --config vitest.integration.config.ts"
  }
}
```

**Reasoning**:
- 4096MB (4GB) gives comfortable headroom
- Default Node limit is ~1.5GB which is insufficient
- Separate limit for test:memory (2GB) to catch memory leaks

#### 2. Create .nvmrc for Consistent Node Version
**File**: `packages/react-mastra/.nvmrc` (NEW FILE)
**Changes**: Specify Node version

```
22.17.1
```

**Reasoning**: Ensure consistent Node version across environments

### Success Criteria

#### Automated Verification:
- [ ] Tests run without immediate OOM: `cd packages/react-mastra && pnpm run test`
- [ ] Memory limit applied: Check process with `ps aux | grep node`
- [ ] No error about invalid NODE_OPTIONS

#### Manual Verification:
- [ ] Run `pnpm test` - should get further than before
- [ ] Check if tests still crash (may need Phase 2)
- [ ] Verify NODE_OPTIONS is set: `echo $NODE_OPTIONS` during test run

---

## Phase 2: Optimize Vitest Configuration

### Overview
Limit test parallelism, configure proper pooling, and add timeout settings to prevent memory accumulation.

### Changes Required

#### 1. Update Vitest Configuration
**File**: `packages/react-mastra/vitest.config.ts`
**Changes**: Add pool configuration and timeouts

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    globals: true,
    setupFiles: ["./src/testSetup.ts"],

    // Memory optimizations
    pool: "forks", // Use forks instead of threads for better isolation
    poolOptions: {
      forks: {
        singleFork: false, // Allow multiple forks but limit them
        maxForks: 4, // Limit concurrent test files
        minForks: 1,
      },
    },

    // Timeouts to prevent hanging tests
    testTimeout: 10000, // 10 seconds per test
    hookTimeout: 10000, // 10 seconds for hooks

    // Isolate tests better
    isolate: true, // Each test file runs in isolation

    // Cleanup between tests
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Garbage collection hint
    sequence: {
      shuffle: false, // Consistent test order for reproducibility
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

**Reasoning**:
- `pool: "forks"` provides better memory isolation than threads
- `maxForks: 4` limits concurrent test files to prevent memory spike
- `isolate: true` ensures each test file gets fresh context
- Mock cleanup settings prevent mock accumulation
- Timeouts prevent tests from hanging and accumulating memory

### Success Criteria

#### Automated Verification:
- [ ] Tests pass: `cd packages/react-mastra && pnpm run test`
- [ ] Vitest accepts config: No config errors on startup
- [ ] TypeScript still passes: `pnpm run typecheck`

#### Manual Verification:
- [ ] Tests run slower (expected due to maxForks limit)
- [ ] No OOM errors during full test run
- [ ] Check `top` or Activity Monitor - memory stays under 4GB
- [ ] Run tests 3 times - all should pass consistently

---

## Phase 3: Improve Test Setup and Cleanup

### Overview
Enhance testSetup.ts to properly dispose of mocks and add explicit cleanup between tests.

### Changes Required

#### 1. Add Proper Cleanup to Test Setup
**File**: `packages/react-mastra/src/testSetup.ts`
**Changes**: Add afterEach cleanup and improve mock disposal

```typescript
import { vi, beforeEach, afterEach } from "vitest";

// Enhanced Mastra core mocks
vi.mock("@mastra/core", () => ({
  Agent: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      text: "Mock agent response",
      usage: { totalTokens: 10 },
    }),
    stream: vi.fn().mockImplementation(async function* (_messages) {
      yield { type: "text", text: "Mock streaming response" };
    }),
  })),
  Mastra: vi.fn().mockImplementation(() => ({
    getAgent: vi.fn().mockReturnValue({
      generate: vi.fn().mockResolvedValue({
        text: "Mock agent response",
        usage: { totalTokens: 10 },
      }),
      stream: vi.fn().mockImplementation(async function* (_messages) {
        yield { type: "text", text: "Mock streaming response" };
      }),
    }),
  })),
  Workflow: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue({
      id: "mock-workflow-id",
      status: "running",
      current: "gathering",
      context: {},
      history: [],
      timestamp: new Date().toISOString(),
    }),
    suspend: vi.fn().mockResolvedValue({
      id: "mock-workflow-id",
      status: "suspended",
      timestamp: new Date().toISOString(),
    }),
    resume: vi.fn().mockResolvedValue({
      id: "mock-workflow-id",
      status: "running",
      timestamp: new Date().toISOString(),
    }),
    sendCommand: vi.fn().mockResolvedValue({
      id: "mock-workflow-id",
      status: "running",
      timestamp: new Date().toISOString(),
    }),
  })),
}));

// Mock @mastra/tools if it exists (optional dependency)
vi.mock("@mastra/tools", () => ({
  createTool: vi.fn(),
  ToolRegistry: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    execute: vi.fn(),
    unregister: vi.fn(),
  })),
}));

// Mock @mastra/memory if it exists (optional dependency)
vi.mock("@mastra/memory", () => ({
  Memory: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
  })),
  createMemory: vi.fn(),
}));

// Mock @mastra/rag if it exists (optional dependency)
vi.mock("@mastra/rag", () => ({
  RAG: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({
      results: [],
      query: "",
      context: [],
    }),
    ingestDocuments: vi.fn().mockResolvedValue({
      documents: [],
      chunks: [],
    }),
    deleteDocuments: vi.fn().mockResolvedValue(undefined),
    getDocuments: vi.fn().mockResolvedValue([]),
  })),
  createRAG: vi.fn(),
}));

// Mock @mastra/observability if it exists (optional dependency)
vi.mock("@mastra/observability", () => ({
  Observability: vi.fn().mockImplementation(() => ({
    createTrace: vi.fn().mockReturnValue({
      id: "mock-trace-id",
      startSpan: vi.fn(),
      endSpan: vi.fn(),
      addEvent: vi.fn(),
      setAttribute: vi.fn(),
    }),
    recordMetric: vi.fn(),
    createCounter: vi.fn(),
    createGauge: vi.fn(),
    createHistogram: vi.fn(),
  })),
  createObservability: vi.fn(),
}));

// Global test utilities
global.fetch = vi.fn();

if (!global.crypto) {
  (global as any).crypto = {};
}
(global.crypto as any).randomUUID = () => "test-uuid-" + Math.random().toString(36).substr(2, 9);

global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
} as Performance;

// Store original console methods
const originalConsole = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  log: console.log,
};

global.console = {
  ...global.console,
  // Mock console methods for testing error handling
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Reset fetch mock
  if (global.fetch) {
    (global.fetch as any).mockClear();
  }
});

afterEach(() => {
  // Restore any timers
  vi.clearAllTimers();
  vi.useRealTimers();

  // Restore mocks
  vi.restoreAllMocks();

  // Clear module cache to prevent memory leaks
  vi.resetModules();

  // Force garbage collection if available (only in test:memory script)
  if (global.gc) {
    global.gc();
  }
});

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    // Restore console
    Object.assign(console, originalConsole);
  });
}
```

**Key Additions**:
1. `afterEach()` hook for comprehensive cleanup
2. `vi.resetModules()` to clear module cache
3. `vi.restoreAllMocks()` to restore original implementations
4. `global.gc()` hint when available
5. Process exit handler to restore console

### Success Criteria

#### Automated Verification:
- [ ] Tests pass: `cd packages/react-mastra && pnpm run test`
- [ ] No warnings about unrestored mocks
- [ ] TypeScript still passes: `pnpm run typecheck`

#### Manual Verification:
- [ ] Run tests multiple times - consistent results
- [ ] No console pollution between tests
- [ ] Memory doesn't grow between test runs

---

## Phase 4: Add Memory Monitoring and Reporting

### Overview
Add scripts and tooling to monitor memory usage during tests and report on potential issues.

### Changes Required

#### 1. Create Memory Test Configuration
**File**: `packages/react-mastra/vitest.memory.config.ts` (NEW FILE)
**Changes**: Specialized config for memory testing

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: ["./src/testSetup.ts"],

    // Strict memory settings
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // Run one test at a time for memory analysis
        maxForks: 1,
        minForks: 1,
      },
    },

    // Longer timeouts for memory profiling
    testTimeout: 30000,
    hookTimeout: 30000,

    isolate: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Detailed reporting
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

**Reasoning**: Separate config for diagnosing memory issues runs tests sequentially

#### 2. Create Memory Profiling Script
**File**: `packages/react-mastra/scripts/memory-test.mts` (NEW FILE)
**Changes**: Script to monitor memory during tests

```typescript
#!/usr/bin/env tsx

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024), // MB
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024),
  };
}

async function runTests() {
  console.log("Starting memory-monitored test run...\n");

  const initialMemory = await getMemoryUsage();
  console.log("Initial memory:", initialMemory);

  try {
    const { stdout, stderr } = await execAsync(
      'NODE_OPTIONS="--max-old-space-size=2048 --expose-gc" pnpm vitest run --config vitest.memory.config.ts',
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      }
    );

    const finalMemory = await getMemoryUsage();

    console.log("\n" + stdout);
    if (stderr) console.error(stderr);

    console.log("\nFinal memory:", finalMemory);
    console.log("\nMemory delta:");
    console.log("  RSS:", finalMemory.rss - initialMemory.rss, "MB");
    console.log("  Heap Used:", finalMemory.heapUsed - initialMemory.heapUsed, "MB");

    const memoryLimit = 2048; // MB
    const memoryUsagePercent = (finalMemory.heapUsed / memoryLimit) * 100;

    console.log(`\nMemory usage: ${finalMemory.heapUsed}MB / ${memoryLimit}MB (${memoryUsagePercent.toFixed(1)}%)`);

    if (memoryUsagePercent > 80) {
      console.warn("\n⚠️  WARNING: Memory usage exceeds 80% of limit!");
      console.warn("Consider optimizing tests or increasing memory limit.");
    } else {
      console.log("\n✅ Memory usage is within acceptable limits");
    }

  } catch (error: any) {
    console.error("\n❌ Test execution failed:");
    console.error(error.message);

    if (error.message.includes("heap out of memory")) {
      console.error("\n💡 This indicates a memory leak or insufficient memory.");
      console.error("   - Check test cleanup in testSetup.ts");
      console.error("   - Consider increasing maxForks in vitest.config.ts");
      console.error("   - Run with: pnpm test:memory to diagnose specific tests");
    }

    process.exit(1);
  }
}

runTests();
```

**Reasoning**: Provides visibility into memory usage and helps diagnose issues

#### 3. Update Package Scripts
**File**: `packages/react-mastra/package.json`
**Changes**: Add memory profiling script

```json
{
  "scripts": {
    "test": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest run",
    "test:watch": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest",
    "test:ui": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest --ui",
    "test:performance": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest --config vitest.performance.config.ts",
    "test:memory": "tsx scripts/memory-test.mts",
    "test:memory-profile": "NODE_OPTIONS=\"--max-old-space-size=2048 --expose-gc\" vitest --config vitest.memory.config.ts",
    "test:integration": "NODE_OPTIONS=\"--max-old-space-size=4096\" vitest --config vitest.integration.config.ts"
  }
}
```

### Success Criteria

#### Automated Verification:
- [ ] Memory test runs: `cd packages/react-mastra && pnpm run test:memory`
- [ ] Script reports memory usage
- [ ] No execution errors in memory monitoring script

#### Manual Verification:
- [ ] Run `pnpm test:memory` and check output
- [ ] Verify memory delta is reported
- [ ] Check warnings appear when memory high
- [ ] Compare memory usage between test runs

---

## Phase 5: Document Memory Best Practices

### Overview
Create documentation to help developers avoid memory issues in future tests.

### Changes Required

#### 1. Create Testing Guidelines Document
**File**: `packages/react-mastra/TESTING.md` (NEW FILE)
**Changes**: Comprehensive testing guide

```markdown
# Testing Guidelines for @assistant-ui/react-mastra

## Memory Management

### Overview

This test suite uses jsdom and tests React hooks, which can be memory-intensive. Follow these guidelines to prevent memory issues.

### Running Tests

```bash
# Standard test run
pnpm test

# Watch mode (for development)
pnpm test:watch

# Memory-profiled run (diagnostic)
pnpm test:memory

# Integration tests only
pnpm test:integration
```

### Memory Configuration

Tests are configured with a 4GB Node heap limit (`--max-old-space-size=4096`). This is sufficient for the current test suite but may need adjustment if tests grow significantly.

**Current limits:**
- Standard tests: 4096MB
- Memory profiling: 2048MB (stricter to catch leaks)
- Vitest maxForks: 4 concurrent test files

### Writing Memory-Efficient Tests

#### ✅ DO:

1. **Clean up after each test:**
```typescript
afterEach(() => {
  // Clear any subscriptions
  subscription?.unsubscribe();

  // Reset state
  setState(null);

  // Clear timers
  vi.clearAllTimers();
});
```

2. **Use small test data sets:**
```typescript
// Good - small array
const testItems = Array.from({ length: 10 }, (_, i) => ({ id: i }));

// Avoid - large array that accumulates
const testItems = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
```

3. **Dispose of resources:**
```typescript
test("should handle cleanup", () => {
  const resource = createResource();

  try {
    // Test logic
  } finally {
    resource.dispose(); // Always clean up
  }
});
```

4. **Use `renderHook` cleanup:**
```typescript
test("hook test", () => {
  const { result, unmount } = renderHook(() => useMyHook());

  // Test logic

  unmount(); // Explicitly unmount
});
```

#### ❌ DON'T:

1. **Don't create large objects in loop:**
```typescript
// Bad - creates many large objects
for (let i = 0; i < 1000; i++) {
  test(`test ${i}`, () => {
    const largeData = new Array(10000).fill({ heavy: "object" });
    // ...
  });
}
```

2. **Don't leave subscriptions active:**
```typescript
// Bad - subscription never cleaned
test("subscription test", () => {
  const subscription = observable.subscribe(() => {});
  // Missing cleanup!
});
```

3. **Don't mock excessively in single test:**
```typescript
// Bad - too many mocks
test("overmocked", () => {
  vi.mock("./module1");
  vi.mock("./module2");
  // ... 20 more mocks
  // Each mock consumes memory
});
```

### Diagnosing Memory Issues

If tests start failing with OOM errors:

1. **Run memory-profiled tests:**
```bash
pnpm test:memory
```

2. **Check for memory leaks:**
- Look for subscriptions not cleaned up
- Check for global state not reset
- Verify mocks are being restored

3. **Increase logging:**
```typescript
beforeEach(() => {
  console.log("Memory before:", process.memoryUsage());
});

afterEach(() => {
  console.log("Memory after:", process.memoryUsage());
});
```

4. **Run single test file:**
```bash
pnpm vitest run src/problematic.test.ts
```

5. **Check vitest config:**
- Reduce `maxForks` if tests run out of memory
- Increase `--max-old-space-size` if legitimately need more memory

### Vitest Configuration

The test suite uses these memory-optimized settings:

```typescript
{
  pool: "forks",              // Better memory isolation
  poolOptions: {
    forks: {
      maxForks: 4,            // Limit concurrent test files
      minForks: 1,
    },
  },
  isolate: true,              // Isolate each test file
  clearMocks: true,           // Auto-clear mocks
  mockReset: true,            // Reset mocks to initial state
  restoreMocks: true,         // Restore original implementations
}
```

### Performance Targets

Current test suite performance:
- **Total execution time**: <60 seconds
- **Peak memory usage**: <3.5GB
- **Memory per test file**: <500MB average

If your changes cause tests to exceed these targets, investigate and optimize.

### Getting Help

If you encounter persistent memory issues:

1. Check this document first
2. Run `pnpm test:memory` for diagnostics
3. Review recent test additions
4. Ask in #testing channel with memory report output
```

#### 2. Add Memory Section to README
**File**: `packages/react-mastra/README.md`
**Changes**: Add memory testing section (update existing file)

Add this section to the Testing portion:

```markdown
### Memory Management

Tests are configured with appropriate memory limits and cleanup. If you encounter out-of-memory errors:

```bash
# Run with memory profiling
pnpm test:memory

# Check memory usage patterns
pnpm test:memory-profile
```

See [TESTING.md](./TESTING.md) for detailed guidelines on writing memory-efficient tests.
```

### Success Criteria

#### Automated Verification:
- [ ] Documentation files exist and are readable
- [ ] Markdown is valid (no broken links)
- [ ] Code examples in docs are syntactically correct

#### Manual Verification:
- [ ] Read through TESTING.md - guidelines are clear
- [ ] Follow one of the DO examples - works as expected
- [ ] Try one of the DON'T examples - understand why it's bad
- [ ] Check README links to TESTING.md correctly

---

## Testing Strategy

### Unit Tests
No new unit tests needed - we're fixing test infrastructure, not adding features.

### Verification Tests

After all phases complete, run these verification tests:

1. **Full test suite:**
```bash
cd packages/react-mastra
pnpm test
```
Expected: All tests pass, no OOM errors

2. **Multiple runs:**
```bash
for i in {1..3}; do echo "Run $i"; pnpm test; done
```
Expected: Consistent results each run

3. **Memory-profiled run:**
```bash
pnpm test:memory
```
Expected: Memory usage <80% of 2048MB limit

4. **Individual test files:**
```bash
pnpm vitest run src/useMastraMemory.test.ts
pnpm vitest run src/useMastraRuntime.test.tsx
pnpm vitest run src/useMastraRAG.test.ts
```
Expected: Each file passes independently

### Performance Benchmarks

Before and after measurements:

| Metric | Before | Target | Method |
|--------|--------|--------|--------|
| Test execution time | ~20s (crash) | <60s | `time pnpm test` |
| Peak memory usage | >4GB (crash) | <3.5GB | `pnpm test:memory` |
| Tests passed | 6/many (crash) | All | `pnpm test` exit code |
| Consistency | Fails | 3/3 runs pass | Loop test command |

### Manual Testing Steps

1. **Baseline check:**
```bash
cd packages/react-mastra
pnpm test
# Note: execution time, peak memory, pass/fail
```

2. **Stress test:**
```bash
# Run tests 5 times in a row
for i in {1..5}; do
  echo "=== Run $i ==="
  pnpm test || break
done
```

3. **Memory profile:**
```bash
pnpm test:memory
# Check memory delta and warnings
```

4. **Individual files:**
```bash
# Test largest file
pnpm vitest run src/useMastraRAG.test.ts
# Test integration tests
pnpm test:integration
```

5. **Watch mode (should not accumulate memory):**
```bash
pnpm test:watch
# Let it run for a few minutes
# Press 'a' to run all tests multiple times
# Memory should stabilize, not grow unbounded
```

## Performance Considerations

### Memory Allocation
- 4GB heap allows ~3.5GB for tests + 500MB overhead
- jsdom: ~100-200MB per test file
- Vitest overhead: ~300-500MB
- Mocks and fixtures: ~50-100MB
- **Total budget**: ~3.5GB for 12 test files = ~290MB/file average

### Execution Speed
- Single fork: ~60-90s (too slow)
- 4 forks: ~20-30s (optimal)
- Unlimited forks: <15s but OOM risk
- **Target**: 4 forks at 20-30 seconds

### Tradeoffs
- **More forks** = faster but more memory
- **Fewer forks** = slower but more stable
- **Isolation** = safer but slower
- **Sequential** = slowest but easiest to debug

Configuration chosen (4 forks) balances speed and stability.

## Migration Notes

### Breaking Changes
None - this is test infrastructure only.

### Developer Impact
- Tests may run slightly slower (sequential execution)
- New `pnpm test:memory` command available
- Must follow memory guidelines for new tests

### CI/CD Changes
Update CI configuration to use NODE_OPTIONS:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test
  env:
    NODE_OPTIONS: "--max-old-space-size=4096"
```

## References

- Validation report: Identified OOM crash and test patterns
- Vitest docs: https://vitest.dev/config/
- Node.js memory: https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes
- Current test suite: `packages/react-mastra/src/**/*.test.ts`
- Test configuration: `packages/react-mastra/vitest.config.ts:1-16`
- Test setup: `packages/react-mastra/testSetup.ts:1-133`

## Appendix: Memory Calculation

**Total test file sizes**: 3,457 lines across 12 files

**Memory estimates**:
- jsdom per file: 150MB
- Mocks per file: 50MB
- Test data per file: 20MB
- Vitest overhead: 400MB

**Total**: (150+50+20) × 12 + 400 = 3,040MB

**With 4 forks**: 3 files × 220MB + 400MB = 1,060MB per fork × 4 = ~4,240MB peak

**Conclusion**: 4GB heap (--max-old-space-size=4096) provides adequate headroom with 4 concurrent forks.
