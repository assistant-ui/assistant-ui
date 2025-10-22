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

Tests are configured with an 8GB Node heap limit (`--max-old-space-size=8192`). This is sufficient for the current test suite but may need adjustment if tests grow significantly.

**Current limits:**

- Standard tests: 8192MB
- Memory profiling: 2048MB (stricter to catch leaks)
- Vitest maxForks: 2 concurrent test files

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
      maxForks: 2,            // Limit concurrent test files
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
