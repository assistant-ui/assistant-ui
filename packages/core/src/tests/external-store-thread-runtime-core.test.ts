import { describe, expect, it, vi } from "vitest";
import { ExternalStoreThreadRuntimeCore } from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";
import type { ModelContextProvider } from "../model-context/types";

const mockContextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const makeStore = (
  overrides?: Partial<ExternalStoreAdapter>,
): ExternalStoreAdapter => ({
  messages: [],
  onNew: vi.fn(),
  ...overrides,
});

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
