import { describe, it, expect, vi } from "vitest";
import { createActionRegistry, emptyActionRegistry } from "./actionRegistry";

describe("createActionRegistry", () => {
  it("dispatch resolves a registered action type and calls its handler with the payload", () => {
    const handler = vi.fn(() => "ok");
    const registry = createActionRegistry({ purchase: handler });

    const result = registry.dispatch({
      type: "purchase",
      itemId: "sku-1",
    });

    expect(handler).toHaveBeenCalledWith({
      payload: { type: "purchase", itemId: "sku-1" },
    });
    expect(result).toBe("ok");
  });

  it("dispatch returns the handler's resolved promise value for async handlers", async () => {
    const registry = createActionRegistry({
      fetch: async () => 42,
    });

    const result = await registry.dispatch({ type: "fetch" });
    expect(result).toBe(42);
  });

  it("dispatch is a no-op (returns undefined) for an unknown action type", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const registry = createActionRegistry({ known: () => undefined });
      expect(registry.dispatch({ type: "unknown" })).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain('"unknown"');
    } finally {
      warn.mockRestore();
    }
  });

  it("has reports whether a handler is registered", () => {
    const registry = createActionRegistry({ a: () => undefined });
    expect(registry.has("a")).toBe(true);
    expect(registry.has("b")).toBe(false);
  });
});

describe("emptyActionRegistry", () => {
  it("dispatch is a no-op for any type", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(
        emptyActionRegistry.dispatch({ type: "anything" }),
      ).toBeUndefined();
    } finally {
      warn.mockRestore();
    }
  });

  it("has is false for any type", () => {
    expect(emptyActionRegistry.has("anything")).toBe(false);
  });
});
