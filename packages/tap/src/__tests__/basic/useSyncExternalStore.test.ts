import { describe, it, expect, afterEach } from "vitest";
import { useSyncExternalStore } from "../../react-hooks/useSyncExternalStore";
import { useCallback } from "../../react-hooks/useCallback";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  waitForNextTick,
  getCommittedValue,
} from "../test-utils";

const createStore = <T>(initial: T) => {
  let state = initial;
  const listeners = new Set<() => void>();
  const store = {
    subscribeCalls: 0,
    unsubscribeCalls: 0,
    getState: () => state,
    setState: (next: T) => {
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void) => {
      store.subscribeCalls++;
      listeners.add(listener);
      return () => {
        store.unsubscribeCalls++;
        listeners.delete(listener);
      };
    },
  };
  return store;
};

const useStore = <T>(store: ReturnType<typeof createStore<T>>) =>
  useSyncExternalStore(
    useCallback((cb) => store.subscribe(cb), [store]),
    useCallback(() => store.getState(), [store]),
  );

describe("useSyncExternalStore", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  it("reads the current snapshot during render", () => {
    const store = createStore(1);
    const testFiber = createTestResource(() => useStore(store));

    expect(renderTest(testFiber)).toBe(1);
  });

  it("re-renders when the store changes", async () => {
    const store = createStore(1);
    const testFiber = createTestResource(() => useStore(store));

    renderTest(testFiber);
    store.setState(2);
    await waitForNextTick();
    expect(getCommittedValue(testFiber)).toBe(2);
  });

  it("does not re-render when the snapshot is Object.is-equal", async () => {
    const store = createStore(1);
    let renders = 0;
    const testFiber = createTestResource(() => {
      renders++;
      return useStore(store);
    });

    renderTest(testFiber);
    const rendersAfterMount = renders;
    store.setState(1);
    await waitForNextTick();
    expect(renders).toBe(rendersAfterMount);
  });

  it("uses getServerSnapshot for the first render and corrects to getSnapshot on mount", async () => {
    const store = createStore("client");
    const testFiber = createTestResource(() =>
      useSyncExternalStore(
        (cb) => store.subscribe(cb),
        () => store.getState(),
        () => "server",
      ),
    );

    // the first render itself returns the server snapshot
    expect(renderTest(testFiber)).toBe("server");
    // the mount effect detects the mismatch and re-renders with the client read
    await waitForNextTick();
    expect(getCommittedValue(testFiber)).toBe("client");
  });

  it("does not re-render when server and client snapshots match", async () => {
    const store = createStore("same");
    let renders = 0;
    const testFiber = createTestResource(() => {
      renders++;
      return useSyncExternalStore(
        (cb) => store.subscribe(cb),
        () => store.getState(),
        () => "same",
      );
    });

    expect(renderTest(testFiber)).toBe("same");
    await waitForNextTick();
    expect(renders).toBe(1);
  });

  it("uses getSnapshot on re-renders after the first", () => {
    const store = createStore("client");
    const testFiber = createTestResource((_p: { n: number }) =>
      useSyncExternalStore(
        (cb) => store.subscribe(cb),
        () => store.getState(),
        () => "server",
      ),
    );

    renderTest(testFiber, { n: 1 });
    expect(renderTest(testFiber, { n: 2 })).toBe("client");
  });

  it("re-subscribes when the store changes identity and unsubscribes on unmount", async () => {
    const storeA = createStore("a");
    const storeB = createStore("b");
    const testFiber = createTestResource(
      (p: { store: ReturnType<typeof createStore<string>> }) =>
        useStore(p.store),
    );

    expect(renderTest(testFiber, { store: storeA })).toBe("a");
    expect(renderTest(testFiber, { store: storeB })).toBe("b");
    await waitForNextTick();
    expect(storeA.unsubscribeCalls).toBe(1);
    expect(storeB.subscribeCalls).toBe(1);

    // storeA changes no longer reach the resource
    storeA.setState("a2");
    await waitForNextTick();
    expect(getCommittedValue(testFiber)).toBe("b");

    storeB.setState("b2");
    await waitForNextTick();
    expect(getCommittedValue(testFiber)).toBe("b2");

    cleanupAllResources();
    expect(storeB.unsubscribeCalls).toBe(1);
  });
});
