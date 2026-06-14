import { createResourceFiberRoot } from "../core/helpers/root";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import type { ResourceFiber } from "../core/types";
import { useState } from "../react-hooks/useState";

/**
 * Creates a test resource fiber for unit testing.
 * This is a low-level utility that creates a ResourceFiber directly.
 * Sets up a rerender callback that automatically re-renders when state changes.
 */
export function createTestResource<R, A extends readonly unknown[]>(
  fn: (...args: A) => R,
) {
  const rerenderCallback = (evaluate: () => boolean, apply: () => boolean) => {
    if (!evaluate()) return;
    apply();

    // Re-render when state changes
    if (activeResources.has(fiber)) {
      const lastArgs = propsMap.get(fiber);
      const value = renderResourceFiber(fiber, lastArgs);
      lastRenderValueMap.set(fiber, value);
      commitResourceFiber(fiber);
    }
  };

  const fiber = createResourceFiber(
    fn,
    createResourceFiberRoot(rerenderCallback),
    undefined,
    null,
  );
  return fiber;
}

// Track resources for cleanup
const activeResources = new Set<ResourceFiber<any, any>>();
const propsMap = new WeakMap<ResourceFiber<any, any>, any>();
const lastRenderValueMap = new WeakMap<ResourceFiber<any, any>, any>();

/**
 * Renders a test resource fiber with the given props and manages its lifecycle.
 * - Tracks resources for cleanup
 * - Returns the current state after render
 */
export function renderTest<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
  ...args: A
): R {
  propsMap.set(fiber, args);

  // Track resource for cleanup
  activeResources.add(fiber);

  // Render with new args. Record the result before committing: the commit can
  // synchronously trigger a nested re-render whose newer result must not be
  // clobbered afterwards.
  const value = renderResourceFiber(fiber, args);
  lastRenderValueMap.set(fiber, value);
  commitResourceFiber(fiber);

  // Return the committed state from the result
  // This accounts for any re-renders that happened during commit
  return value;
}

/**
 * Unmounts a specific resource fiber and removes it from tracking.
 */
export function unmountResource<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
) {
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
export function getCommittedValue<R, A extends readonly unknown[]>(
  fiber: ResourceFiber<R, A>,
): R {
  if (!lastRenderValueMap.has(fiber)) {
    throw new Error(
      "No render result found for fiber. Make sure to call renderResource first.",
    );
  }
  return lastRenderValueMap.get(fiber);
}

/**
 * Helper to subscribe to resource state changes for testing.
 * Tracks call count and latest state value.
 */
export class TestSubscriber<T> {
  public callCount = 0;
  public lastState: T;
  private fiber: ResourceFiber<any, any>;

  constructor(fiber: ResourceFiber<any, any>) {
    this.fiber = fiber;
    // Need to render once to get initial state
    const lastArgs = propsMap.get(fiber) ?? [];
    const initialValue = renderResourceFiber(fiber, lastArgs as any);
    commitResourceFiber(fiber);
    this.lastState = initialValue;
    lastRenderValueMap.set(fiber, initialValue);
    activeResources.add(fiber);
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
export class TestResourceManager<R, A extends readonly unknown[]> {
  private isActive = false;

  constructor(public fiber: ResourceFiber<R, A>) {}

  renderAndMount(...args: A): R {
    if (this.isActive) {
      throw new Error("Resource already active");
    }

    this.isActive = true;
    activeResources.add(this.fiber);
    propsMap.set(this.fiber, args);
    const value = renderResourceFiber(this.fiber, args);
    commitResourceFiber(this.fiber);
    lastRenderValueMap.set(this.fiber, value);
    return value;
  }

  cleanup() {
    if (this.isActive && activeResources.has(this.fiber)) {
      unmountResourceFiber(this.fiber);
      activeResources.delete(this.fiber);
      this.isActive = false;
    }
  }
}

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
  interval = 10,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

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
  return (props: { initial: number }) => {
    const [count, setCount] = useState(props.initial);
    return {
      count,
      increment: () => setCount((c: number) => c + 1),
      decrement: () => setCount((c: number) => c - 1),
    };
  };
}
