import { createResourceFiberRoot } from "../core/helpers/root";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import type { ResourceFiber } from "../core/types";
import { useState } from "../react-hooks/useState";

export type TestFiber<R, A extends readonly unknown[]> = ResourceFiber<R> & {
  readonly __args?: (args: A) => void;
};

const pendingRerenders = new Set<ResourceFiber<any>>();
let isPassOnStack = false;

function runPass<T>(fn: () => T): T {
  const prev = isPassOnStack;
  isPassOnStack = true;
  try {
    return fn();
  } finally {
    isPassOnStack = prev;
  }
}

function drainPendingRerenders() {
  if (isPassOnStack) return;
  runPass(() => {
    let passes = 0;
    for (const fiber of pendingRerenders) {
      pendingRerenders.delete(fiber);
      if (++passes > 50) {
        throw new Error("Too many re-render passes in test harness");
      }
      if (!activeResources.has(fiber)) continue;
      const lastArgs = propsMap.get(fiber);
      const value = renderResourceFiber(fiber, lastArgs);
      lastRenderValueMap.set(fiber, value);
      commitResourceFiber(fiber);
    }
  });
}

/**
 * Creates a test resource fiber for unit testing.
 * This is a low-level utility that creates a ResourceFiber directly.
 * Sets up a rerender callback that automatically re-renders when state changes.
 */
export function createTestResource<R, A extends readonly unknown[]>(
  fn: (...args: A) => R,
): TestFiber<R, A> {
  const rerenderCallback = (evaluate: () => boolean, apply: () => boolean) => {
    if (!evaluate()) return;
    apply();

    pendingRerenders.add(fiber);
    drainPendingRerenders();
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
const activeResources = new Set<ResourceFiber<any>>();
const propsMap = new WeakMap<ResourceFiber<any>, any>();
const lastRenderValueMap = new WeakMap<ResourceFiber<any>, any>();

/**
 * Renders a test resource fiber with the given props and manages its lifecycle.
 * - Tracks resources for cleanup
 * - Returns the current state after render
 */
export function renderTest<R, A extends readonly unknown[]>(
  fiber: TestFiber<R, A>,
  ...args: A
): R {
  propsMap.set(fiber, args);

  // Track resource for cleanup
  activeResources.add(fiber);

  const value = runPass(() => {
    const rendered = renderResourceFiber(fiber, args);
    lastRenderValueMap.set(fiber, rendered);
    commitResourceFiber(fiber);
    return rendered;
  });
  drainPendingRerenders();

  return value;
}

/**
 * Unmounts a specific resource fiber and removes it from tracking.
 */
export function unmountResource<R>(fiber: ResourceFiber<R>) {
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
export function getCommittedValue<R>(fiber: ResourceFiber<R>): R {
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
  private fiber: ResourceFiber<any>;

  constructor(fiber: ResourceFiber<any>) {
    this.fiber = fiber;
    // Need to render once to get initial state
    const initialValue = runPass(() => {
      const lastArgs = propsMap.get(fiber) ?? [];
      const value = renderResourceFiber(fiber, lastArgs as any);
      commitResourceFiber(fiber);
      return value;
    });
    drainPendingRerenders();
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

  public fiber: TestFiber<R, A>;

  constructor(fiber: TestFiber<R, A>) {
    this.fiber = fiber;
  }

  renderAndMount(...args: A): R {
    if (this.isActive) {
      throw new Error("Resource already active");
    }

    this.isActive = true;
    activeResources.add(this.fiber);
    propsMap.set(this.fiber, args);
    const value = runPass(() => {
      const rendered = renderResourceFiber(this.fiber, args);
      lastRenderValueMap.set(this.fiber, rendered);
      commitResourceFiber(this.fiber);
      return rendered;
    });
    drainPendingRerenders();
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
