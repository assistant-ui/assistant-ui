import { describe, expect, it, vi } from "vitest";
import { ExternalStoreThreadRuntimeCore } from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";
import type { ModelContextProvider } from "../model-context/types";

const mockContextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const makeStore = (
  overrides?: Partial<ExternalStoreAdapter> | Record<string, unknown>,
): ExternalStoreAdapter =>
  ({
    messages: [],
    onNew: vi.fn(),
    ...overrides,
  }) as ExternalStoreAdapter;

describe("ExternalStoreThreadRuntimeCore - state reference stability", () => {
  describe("capabilities", () => {
    it("should preserve reference when values are unchanged", () => {
      const runtime = new ExternalStoreThreadRuntimeCore(
        mockContextProvider,
        makeStore({ isRunning: false }),
      );

      const capsBefore = runtime.capabilities;

      runtime.__internal_setAdapter(makeStore({ isRunning: true }));

      expect(runtime.capabilities).toBe(capsBefore);
      expect(runtime.capabilities).toEqual(capsBefore);
    });

    it("should update reference when values actually change", () => {
      const runtime = new ExternalStoreThreadRuntimeCore(
        mockContextProvider,
        makeStore(),
      );

      const capsBefore = runtime.capabilities;
      expect(capsBefore.edit).toBe(false);

      runtime.__internal_setAdapter(makeStore({ onEdit: vi.fn() }));

      expect(runtime.capabilities.edit).toBe(true);
      expect(runtime.capabilities).not.toBe(capsBefore);
    });

    it("should maintain stable reference across repeated setAdapter calls", () => {
      const runtime = new ExternalStoreThreadRuntimeCore(
        mockContextProvider,
        makeStore(),
      );

      const initialCaps = runtime.capabilities;

      for (let i = 0; i < 10; i++) {
        runtime.__internal_setAdapter(makeStore({ isRunning: i % 2 === 0 }));
      }

      expect(runtime.capabilities).toBe(initialCaps);
    });
  });

  describe("suggestions", () => {
    it("should preserve reference when array contents are identical", () => {
      const suggestion = { prompt: "Hello" };
      const runtime = new ExternalStoreThreadRuntimeCore(
        mockContextProvider,
        makeStore({ suggestions: [suggestion] }),
      );

      const suggestionsBefore = runtime.suggestions;

      // New array reference with same contents
      runtime.__internal_setAdapter(makeStore({ suggestions: [suggestion] }));

      expect(runtime.suggestions).toBe(suggestionsBefore);
    });

    it("should update reference when contents change", () => {
      const runtime = new ExternalStoreThreadRuntimeCore(
        mockContextProvider,
        makeStore({ suggestions: [{ prompt: "Hello" }] }),
      );

      const suggestionsBefore = runtime.suggestions;

      runtime.__internal_setAdapter(
        makeStore({ suggestions: [{ prompt: "Goodbye" }] }),
      );

      expect(runtime.suggestions).not.toBe(suggestionsBefore);
    });

    it("should preserve reference for empty arrays", () => {
      const runtime = new ExternalStoreThreadRuntimeCore(
        mockContextProvider,
        makeStore({ suggestions: [] }),
      );

      const suggestionsBefore = runtime.suggestions;

      runtime.__internal_setAdapter(makeStore({ suggestions: [] }));

      expect(runtime.suggestions).toBe(suggestionsBefore);
    });
  });

  describe("extras", () => {
    it("should preserve reference when value is identical", () => {
      const extras = { foo: "bar" };
      const runtime = new ExternalStoreThreadRuntimeCore(
        mockContextProvider,
        makeStore({ extras }),
      );

      expect(runtime.extras).toBe(extras);

      // New store but same extras reference
      runtime.__internal_setAdapter(makeStore({ extras }));

      expect(runtime.extras).toBe(extras);
    });

    it("should update when extras reference changes", () => {
      const runtime = new ExternalStoreThreadRuntimeCore(
        mockContextProvider,
        makeStore({ extras: { foo: "bar" } }),
      );

      const newExtras = { foo: "baz" };
      runtime.__internal_setAdapter(makeStore({ extras: newExtras }));

      expect(runtime.extras).toBe(newExtras);
    });
  });

  it("should skip setAdapter entirely when store reference is the same", () => {
    const store = makeStore();
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      store,
    );

    const capsBefore = runtime.capabilities;

    runtime.__internal_setAdapter(store);

    expect(runtime.capabilities).toBe(capsBefore);
  });
});
describe("ExternalStoreThreadRuntimeCore - initialize event replay", () => {
  const message = { id: "m", role: "assistant" as const, content: [] };
  const flushMicrotasks = () => Promise.resolve();

  it("replays initialize to subscribers that attach after initialization", async () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({ messages: [message] }),
    );

    const callback = vi.fn();
    runtime.unstable_on("initialize", callback);

    expect(callback).not.toHaveBeenCalled();
    await flushMicrotasks();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not fire before initialization, then fires exactly once", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({ messages: [] }),
    );

    const callback = vi.fn();
    runtime.unstable_on("initialize", callback);
    expect(callback).not.toHaveBeenCalled();

    runtime.__internal_setAdapter(makeStore({ messages: [message] }));
    expect(callback).toHaveBeenCalledTimes(1);

    runtime.__internal_setAdapter(makeStore({ messages: [message] }));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("delivers initialize once to each late subscriber", async () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({ messages: [message] }),
    );

    const late1 = vi.fn();
    const late2 = vi.fn();
    runtime.unstable_on("initialize", late1);
    runtime.unstable_on("initialize", late2);

    await flushMicrotasks();
    expect(late1).toHaveBeenCalledTimes(1);
    expect(late2).toHaveBeenCalledTimes(1);
  });

  it("skips the replay when the subscriber unsubscribes before it runs", async () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({ messages: [message] }),
    );

    const callback = vi.fn();
    const unsubscribe = runtime.unstable_on("initialize", callback);
    unsubscribe();

    await flushMicrotasks();
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not replay non-latched events such as runEnd", async () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({ messages: [message], isRunning: true }),
    );

    runtime.__internal_setAdapter(
      makeStore({ messages: [message], isRunning: false }),
    );

    const callback = vi.fn();
    runtime.unstable_on("runEnd", callback);

    await flushMicrotasks();
    expect(callback).not.toHaveBeenCalled();
  });
});
