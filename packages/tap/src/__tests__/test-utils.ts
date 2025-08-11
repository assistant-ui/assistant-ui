import {
  createResourceFiber,
  unmountResource as unmountResourceFiber,
  renderResource as renderResourceFiber,
  commitResource,
} from "../core/ResourceFiber";
import { ResourceFn, ResourceFiber } from "../core/types";

// ============================================================================
// Resource Creation
// ============================================================================

/**
 * Creates a test resource fiber for unit testing.
 * This is a low-level utility that creates a ResourceFiber directly.
 * Sets up a rerender callback that automatically re-renders when state changes.
 */
export function createTestResource<R, P>(type: ResourceFn<R, P>) {
  let fiber: ResourceFiber;

  const rerenderCallback = () => {
    // Re-render when state changes
    if (activeResources.has(fiber)) {
      const lastProps = propsMap.get(fiber);
      const result = renderResourceFiber(fiber, lastProps);
      commitResource(fiber, result);
      lastRenderResultMap.set(fiber, result);
    }
  };

  fiber = createResourceFiber(type, rerenderCallback);
  return fiber;
}

// ============================================================================
// Resource Lifecycle Management
// ============================================================================

// Track resources for cleanup
const activeResources = new Set<ResourceFiber>();
const propsMap = new WeakMap<ResourceFiber, any>();
const lastRenderResultMap = new WeakMap<ResourceFiber, any>();

/**
 * Renders a test resource fiber with the given props and manages its lifecycle.
 * - Tracks resources for cleanup
 * - Returns the current state after render
 */
export function renderTest<R, P>(fiber: ResourceFiber, props: P): R {
  propsMap.set(fiber, props);

  // Track resource for cleanup
  activeResources.add(fiber);

  // Render with new props
  const result = renderResourceFiber(fiber, props);
  commitResource(fiber, result);
  lastRenderResultMap.set(fiber, result);

  // Return the committed state from the result
  // This accounts for any re-renders that happened during commit
  return result.state;
}

/**
 * Unmounts a specific resource fiber and removes it from tracking.
 */
export function unmountResource(fiber: ResourceFiber) {
  if (activeResources.has(fiber)) {
    unmountResourceFiber(fiber);
    activeResources.delete(fiber);
  }
}

/**
 * Cleans up all resources. Should be called after each test.
 */
export function cleanupAllResources() {
  activeResources.forEach((fiber) => unmountResourceFiber(fiber));
  activeResources.clear();
}

/**
 * Gets the current committed state of a resource fiber.
 * Returns the state from the last render/commit cycle.
 */
export function getCommittedState<R>(fiber: ResourceFiber): R {
  const lastResult = lastRenderResultMap.get(fiber);
  if (!lastResult) {
    throw new Error(
      "No render result found for fiber. Make sure to call renderResource first."
    );
  }
  return lastResult.state;
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to subscribe to resource state changes for testing.
 * Tracks call count and latest state value.
 */
export class TestSubscriber<T> {
  public callCount = 0;
  public lastState: T;
  private fiber: ResourceFiber;

  constructor(fiber: ResourceFiber) {
    this.fiber = fiber;
    // Need to render once to get initial state
    const lastProps = propsMap.get(fiber) ?? undefined;
    const initialResult = renderResourceFiber(fiber, lastProps as any);
    commitResource(fiber, initialResult);
    this.lastState = initialResult.state;
    lastRenderResultMap.set(fiber, initialResult);
    activeResources.add(fiber);

    // Update the fiber's rerender callback
    (fiber as any)._rerenderCallback = () => {
      this.callCount++;
      // Re-render to get latest state
      const lastProps = propsMap.get(fiber) ?? undefined;
      const result = renderResourceFiber(fiber, lastProps as any);
      commitResource(fiber, result);
      this.lastState = result.state;
      lastRenderResultMap.set(fiber, result);
    };
  }

  cleanup() {
    if (activeResources.has(this.fiber)) {
      unmountResourceFiber(this.fiber);
      activeResources.delete(this.fiber);
    }
  }
}

/**
 * Helper class to manage resource lifecycle in tests with explicit control.
 * Useful when you need fine-grained control over mount/unmount timing.
 */
export class TestResourceManager<R, P> {
  private isActive = false;

  constructor(public fiber: ResourceFiber) {}

  renderAndMount(props: P): R {
    if (this.isActive) {
      throw new Error("Resource already active");
    }

    this.isActive = true;
    activeResources.add(this.fiber);
    propsMap.set(this.fiber, props);
    const result = renderResourceFiber(this.fiber, props);
    commitResource(this.fiber, result);
    lastRenderResultMap.set(this.fiber, result);
    return result.state;
  }

  cleanup() {
    if (this.isActive && activeResources.has(this.fiber)) {
      unmountResourceFiber(this.fiber);
      activeResources.delete(this.fiber);
      this.isActive = false;
    }
  }
}

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Waits for the next tick of the event loop.
 * Useful for testing async state updates.
 */
export function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Waits for a condition to be true with timeout.
 * Useful for testing eventual consistency.
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 10
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Creates a simple counter resource for testing.
 * Commonly used across multiple test files.
 */
export function createCounterResource(initialValue = 0) {
  return (props: { value?: number }) => {
    const value = props.value ?? initialValue;
    return { count: value };
  };
}

/**
 * Creates a stateful counter resource for testing.
 * Includes increment/decrement functions.
 */
export function createStatefulCounterResource() {
  // Import at top of file to avoid issues
  const { tapState } = require("../hooks/tap-state");

  return (props: { initial: number }) => {
    const [count, setCount] = tapState(props.initial);
    return {
      count,
      increment: () => setCount((c: number) => c + 1),
      decrement: () => setCount((c: number) => c - 1),
    };
  };
}
