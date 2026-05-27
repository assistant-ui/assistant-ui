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

describe("ExternalStoreThreadRuntimeCore - messages reconciliation", () => {
  const user = { id: "u", role: "user" as const, content: [] };

  it("drops ids that disappear between syncs (same length, swapped assistant id)", () => {
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({ messages: [user, a1] }),
    );

    runtime.__internal_setAdapter(makeStore({ messages: [user, a2] }));

    const exported = runtime.export();
    expect(exported.messages.map((m) => m.message.id)).toEqual(["u", "a2"]);
    const userChildren = exported.messages
      .filter((m) => m.parentId === "u")
      .map((m) => m.message.id);
    expect(userChildren).toEqual(["a2"]);
  });

  it("keeps prior ids when they remain in the new sync", () => {
    const a = { id: "a", role: "assistant" as const, content: [] };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({ messages: [user, a] }),
    );

    runtime.__internal_setAdapter(makeStore({ messages: [user, a] }));

    expect(runtime.export().messages.map((m) => m.message.id)).toEqual([
      "u",
      "a",
    ]);
  });

  it("removes trailing messages dropped from the new sync", () => {
    const a = { id: "a", role: "assistant" as const, content: [] };
    const u2 = { id: "u2", role: "user" as const, content: [] };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({ messages: [user, a, u2] }),
    );

    runtime.__internal_setAdapter(makeStore({ messages: [user, a] }));

    expect(runtime.export().messages.map((m) => m.message.id)).toEqual([
      "u",
      "a",
    ]);
  });

  it("preserves a reloaded assistant as a branch", async () => {
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [user, a1],
        onReload: vi.fn(),
        setMessages: vi.fn(),
      }),
    );

    await runtime.startRun({ parentId: "u", sourceId: "a1", runConfig: {} });
    runtime.__internal_setAdapter(
      makeStore({ messages: [user, a2], setMessages: vi.fn() }),
    );

    const exported = runtime.export().messages;
    expect(exported.map((m) => m.message.id)).toEqual(["u", "a1", "a2"]);
    expect(
      exported.filter((m) => m.parentId === "u").map((m) => m.message.id),
    ).toEqual(["a1", "a2"]);
    expect(runtime.getBranches("a2")).toEqual(["a1", "a2"]);
  });

  it("keeps reloaded assistant branches after switching back to an inactive branch", async () => {
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [user, a1],
        onReload: vi.fn(),
        setMessages: vi.fn(),
      }),
    );

    await runtime.startRun({ parentId: "u", sourceId: "a1", runConfig: {} });
    runtime.__internal_setAdapter(
      makeStore({ messages: [user, a2], setMessages: vi.fn() }),
    );

    runtime.switchToBranch("a1");
    runtime.__internal_setAdapter(
      makeStore({ messages: [user, a1], setMessages: vi.fn() }),
    );

    expect(runtime.getBranches("a1")).toEqual(["a1", "a2"]);

    runtime.switchToBranch("a2");
    runtime.__internal_setAdapter(
      makeStore({ messages: [user, a2], setMessages: vi.fn() }),
    );

    expect(runtime.getBranches("a2")).toEqual(["a1", "a2"]);
  });

  it("does not keep a phantom selected branch id after branch switch preservation", async () => {
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };
    const serverA1 = {
      id: "server-a1",
      role: "assistant" as const,
      content: [],
    };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [user, a1],
        onReload: vi.fn(),
        setMessages: vi.fn(),
      }),
    );

    await runtime.startRun({ parentId: "u", sourceId: "a1", runConfig: {} });
    runtime.__internal_setAdapter(
      makeStore({ messages: [user, a2], setMessages: vi.fn() }),
    );

    runtime.switchToBranch("a1");
    runtime.__internal_setAdapter(
      makeStore({ messages: [user, a1], setMessages: vi.fn() }),
    );
    runtime.__internal_setAdapter(
      makeStore({ messages: [user, serverA1], setMessages: vi.fn() }),
    );

    expect(runtime.export().messages.map((m) => m.message.id)).toEqual([
      "u",
      "a2",
      "server-a1",
    ]);
    expect(runtime.getBranches("server-a1")).toEqual(["a2", "server-a1"]);
  });

  it("preserves an edited user and its old descendants as a branch", async () => {
    const u1 = { id: "u1", role: "user" as const, content: [] };
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const u2 = { id: "u2", role: "user" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [u1, a1],
        onEdit: vi.fn(),
        setMessages: vi.fn(),
      }),
    );

    await runtime.append({
      role: "user",
      content: [],
      parentId: null,
      sourceId: "u1",
      runConfig: {},
    });
    runtime.__internal_setAdapter(
      makeStore({ messages: [u2, a2], setMessages: vi.fn() }),
    );

    const exported = runtime.export().messages;
    expect(exported.map((m) => m.message.id)).toEqual(["u1", "a1", "u2", "a2"]);
    expect(exported.find((m) => m.message.id === "a1")?.parentId).toBe("u1");
    expect(exported.find((m) => m.message.id === "a2")?.parentId).toBe("u2");
    expect(runtime.getBranches("u2")).toEqual(["u1", "u2"]);
  });

  it("keeps edited user branches after switching back to an inactive branch", async () => {
    const u1 = { id: "u1", role: "user" as const, content: [] };
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const u2 = { id: "u2", role: "user" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [u1, a1],
        onEdit: vi.fn(),
        setMessages: vi.fn(),
      }),
    );

    await runtime.append({
      role: "user",
      content: [],
      parentId: null,
      sourceId: "u1",
      runConfig: {},
    });
    runtime.__internal_setAdapter(
      makeStore({ messages: [u2, a2], setMessages: vi.fn() }),
    );

    runtime.switchToBranch("u1");
    runtime.__internal_setAdapter(
      makeStore({ messages: [u1, a1], setMessages: vi.fn() }),
    );

    expect(runtime.getBranches("u1")).toEqual(["u1", "u2"]);

    runtime.switchToBranch("u2");
    runtime.__internal_setAdapter(
      makeStore({ messages: [u2, a2], setMessages: vi.fn() }),
    );

    expect(runtime.getBranches("u2")).toEqual(["u1", "u2"]);
  });

  it("keeps nested assistant branches after switching an ancestor branch away and back", async () => {
    type TestMessage = {
      id: string;
      role: "user" | "assistant";
      content: [];
    };
    const u0 = { id: "u0", role: "user" as const, content: [] };
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };
    const u2 = { id: "u2", role: "user" as const, content: [] };
    const u1 = { id: "u1", role: "user" as const, content: [] };
    const u1a = { id: "u1a", role: "assistant" as const, content: [] };
    const b1 = { id: "b1", role: "assistant" as const, content: [] };
    const b2 = { id: "b2", role: "assistant" as const, content: [] };

    let runtime!: ExternalStoreThreadRuntimeCore;
    const makeBranchingStore = (
      messages: readonly TestMessage[],
    ): ExternalStoreAdapter =>
      makeStore({
        messages,
        onEdit: vi.fn(),
        onReload: vi.fn(),
        setMessages: vi.fn(),
      });
    const syncMessages = (messages: readonly TestMessage[]) => {
      runtime.__internal_setAdapter(makeBranchingStore(messages));
    };

    runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeBranchingStore([u0, a1]),
    );

    await runtime.startRun({ parentId: "u0", sourceId: "a1", runConfig: {} });
    syncMessages([u0, a2]);

    runtime.switchToBranch("a1");

    syncMessages([u0, a1, u1, u1a]);

    await runtime.append({
      role: "user",
      content: [],
      parentId: "a1",
      sourceId: "u1",
      runConfig: {},
    });
    syncMessages([u0, a1, u2, b1]);

    await runtime.startRun({ parentId: "u2", sourceId: "b1", runConfig: {} });
    syncMessages([u0, a1, u2, b2]);

    runtime.switchToBranch("b1");
    syncMessages([u0, a1, u2, b1]);

    expect(runtime.getBranches("a1")).toEqual(["a1", "a2"]);
    expect(runtime.getBranches("u2")).toEqual(["u1", "u2"]);
    expect(runtime.getBranches("b1")).toEqual(["b1", "b2"]);

    runtime.switchToBranch("a2");
    syncMessages([u0, a1, u2, b1]);
    syncMessages([u0, a2]);

    runtime.switchToBranch("a1");
    syncMessages([u0, a1, u2, b1]);

    expect(runtime.getBranches("b1")).toEqual(["b1", "b2"]);
  });

  it("keeps three assistant branches when switching away from a branch with nested branches", async () => {
    type TestMessage = {
      id: string;
      role: "user" | "assistant";
      content: [];
    };
    const u0 = { id: "u0", role: "user" as const, content: [] };
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };
    const a3 = { id: "a3", role: "assistant" as const, content: [] };
    const u1 = { id: "u1", role: "user" as const, content: [] };
    const u1a = { id: "u1a", role: "assistant" as const, content: [] };
    const u2 = { id: "u2", role: "user" as const, content: [] };
    const b1 = { id: "b1", role: "assistant" as const, content: [] };
    const b2 = { id: "b2", role: "assistant" as const, content: [] };

    let runtime!: ExternalStoreThreadRuntimeCore;
    const makeBranchingStore = (
      messages: readonly TestMessage[],
    ): ExternalStoreAdapter =>
      makeStore({
        messages,
        onEdit: vi.fn(),
        onReload: vi.fn(),
        setMessages: vi.fn(),
      });
    const syncMessages = (messages: readonly TestMessage[]) => {
      runtime.__internal_setAdapter(makeBranchingStore(messages));
    };

    runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeBranchingStore([u0, a1]),
    );

    await runtime.startRun({ parentId: "u0", sourceId: "a1", runConfig: {} });
    syncMessages([u0, a2]);

    await runtime.startRun({ parentId: "u0", sourceId: "a2", runConfig: {} });
    syncMessages([u0, a3]);

    runtime.switchToBranch("a1");
    syncMessages([u0, a1, u1, u1a]);

    await runtime.append({
      role: "user",
      content: [],
      parentId: "a1",
      sourceId: "u1",
      runConfig: {},
    });
    syncMessages([u0, a1, u2, b1]);

    await runtime.startRun({ parentId: "u2", sourceId: "b1", runConfig: {} });
    syncMessages([u0, a1, u2, b2]);

    expect(runtime.getBranches("a1")).toEqual(["a1", "a2", "a3"]);
    expect(runtime.getBranches("u2")).toEqual(["u1", "u2"]);
    expect(runtime.getBranches("b2")).toEqual(["b1", "b2"]);

    runtime.switchToBranch("a2");
    syncMessages([u0, a2, u2, b2]);

    expect(runtime.getBranches("a2")).toEqual(["a1", "a2", "a3"]);
    expect(runtime.getBranches("u2")).toEqual(["u1", "u2"]);
    expect(runtime.getBranches("b2")).toEqual(["b1", "b2"]);
  });

  it("does not clear pending branch preservation on a pre-truncation sync", async () => {
    const a1 = { id: "a1", role: "assistant" as const, content: [] };
    const a2 = { id: "a2", role: "assistant" as const, content: [] };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [user, a1],
        onReload: vi.fn(),
        setMessages: vi.fn(),
      }),
    );

    await runtime.startRun({ parentId: "u", sourceId: "a1", runConfig: {} });
    runtime.__internal_setAdapter(
      makeStore({
        messages: [user, a1],
        isRunning: true,
        setMessages: vi.fn(),
      }),
    );
    runtime.__internal_setAdapter(
      makeStore({ messages: [user, a2], setMessages: vi.fn() }),
    );

    expect(runtime.getBranches("a2")).toEqual(["a1", "a2"]);
  });

  it("does not crash on the next sync after cancelRun removes a leaf user", () => {
    const userWithText = {
      id: "u",
      role: "user" as const,
      content: [{ type: "text" as const, text: "hi" }],
    };

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [userWithText],
        onCancel: vi.fn(),
        isRunning: true,
      }),
    );

    runtime.cancelRun();

    expect(() => {
      runtime.__internal_setAdapter(makeStore({ messages: [] }));
    }).not.toThrow();
  });

  it("drops phantom sibling when convertMessage swaps the assistant id", () => {
    type Raw = { id: string; role: "user" | "assistant"; text: string };
    const rawU: Raw = { id: "u", role: "user", text: "hi" };
    const rawA1: Raw = { id: "client_id", role: "assistant", text: "" };
    const rawA2: Raw = { id: "server_id", role: "assistant", text: "" };

    const convertMessage = (m: Raw) => ({
      id: m.id,
      role: m.role,
      content: [{ type: "text" as const, text: m.text }],
    });

    const runtime = new ExternalStoreThreadRuntimeCore(
      mockContextProvider,
      makeStore({
        messages: [rawU, rawA1] as any,
        convertMessage: convertMessage as any,
      }),
    );

    runtime.__internal_setAdapter(
      makeStore({
        messages: [rawU, rawA2] as any,
        convertMessage: convertMessage as any,
      }),
    );

    const userChildren = runtime
      .export()
      .messages.filter((m) => m.parentId === "u")
      .map((m) => m.message.id);
    expect(userChildren).toEqual(["server_id"]);
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
