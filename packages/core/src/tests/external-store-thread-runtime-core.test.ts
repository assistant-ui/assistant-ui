import { describe, expect, it, vi } from "vitest";
import { ExternalStoreThreadRuntimeCore } from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";
import type { ModelContextProvider } from "../model-context/types";
import type { ThreadMessageLike } from "../runtime/utils/thread-message-like";

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
describe("ExternalStoreThreadRuntimeCore - optimistic message reconciliation", () => {
  type Raw = {
    id: string;
    role: "user" | "assistant";
    text: string;
    optimistic?: boolean;
  };

  const convertMessage = (m: Raw): ThreadMessageLike => ({
    id: m.id,
    role: m.role,
    content: [{ type: "text", text: m.text }],
    ...(m.optimistic && { metadata: { isOptimistic: true } }),
  });

  const childrenOf = (
    runtime: ExternalStoreThreadRuntimeCore,
    parentId: string,
  ) =>
    runtime
      .export()
      .messages.filter((m) => m.parentId === parentId)
      .map((m) => m.message.id);

  it("drops the orphaned placeholder when an optimistic id is swapped mid-run", () => {
    const u: Raw = { id: "u", role: "user", text: "hi" };
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [
          u,
          { id: "client_id", role: "assistant", text: "", optimistic: true },
        ],
        convertMessage,
        isRunning: true,
      }),
    );

    // AI SDK v6 swaps the client-generated id for the server-provided one.
    runtime.__internal_setAdapter(
      makeStore({
        messages: [
          u,
          {
            id: "server_id",
            role: "assistant",
            text: "hello",
            optimistic: true,
          },
        ],
        convertMessage,
        isRunning: true,
      }),
    );

    // No phantom sibling: the user message has a single child.
    expect(childrenOf(runtime, "u")).toEqual(["server_id"]);
  });

  it("clears the optimistic flag once the run settles", () => {
    const u: Raw = { id: "u", role: "user", text: "hi" };
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [
          u,
          { id: "a", role: "assistant", text: "...", optimistic: true },
        ],
        convertMessage,
        isRunning: true,
      }),
    );

    runtime.__internal_setAdapter(
      makeStore({
        messages: [u, { id: "a", role: "assistant", text: "done" }],
        convertMessage,
        isRunning: false,
      }),
    );

    const settled = runtime.export().messages.find((m) => m.message.id === "a");
    expect(settled?.message.metadata.isOptimistic).toBeFalsy();
    expect(childrenOf(runtime, "u")).toEqual(["a"]);
  });

  it("keeps real sibling branches that were never flagged optimistic", () => {
    const u: Raw = { id: "u", role: "user", text: "hi" };
    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [u, { id: "a1", role: "assistant", text: "first" }],
        convertMessage,
      }),
    );

    // Simulates onEdit/onReload producing a new branch under the same parent;
    // the prior branch must survive (regression guard for #4131).
    runtime.__internal_setAdapter(
      makeStore({
        messages: [u, { id: "a2", role: "assistant", text: "second" }],
        convertMessage,
      }),
    );

    expect(childrenOf(runtime, "u")).toEqual(["a1", "a2"]);
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
