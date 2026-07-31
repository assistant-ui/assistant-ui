import { describe, expect, it, vi } from "vitest";
import { ModelContextRegistry } from "./registry";

describe("ModelContextRegistry", () => {
  it("isolates subscriber errors while registering tools", () => {
    const registry = new ModelContextRegistry();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    registry.subscribe(() => {
      throw error;
    });
    registry.subscribe(laterSubscriber);

    try {
      const handle = registry.addTool({ toolName: "search" });

      expect(registry.getModelContext().tools).toHaveProperty("search");
      expect(laterSubscriber).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Model context registry listener threw an error",
        error,
      );

      handle.remove();

      expect(registry.getModelContext().tools).toBeUndefined();
      expect(laterSubscriber).toHaveBeenCalledTimes(2);
    } finally {
      consoleError.mockRestore();
    }
  });
});
