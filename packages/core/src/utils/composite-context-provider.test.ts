import { describe, expect, it, vi } from "vitest";
import { CompositeContextProvider } from "./composite-context-provider";

describe("CompositeContextProvider", () => {
  it("isolates subscriber errors while registering providers", () => {
    const composite = new CompositeContextProvider();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    composite.subscribe(() => {
      throw error;
    });
    composite.subscribe(laterSubscriber);

    try {
      const unregister = composite.registerModelContextProvider({
        getModelContext: () => ({ system: "provider instructions" }),
      });

      expect(composite.getModelContext().system).toBe("provider instructions");
      expect(laterSubscriber).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Model context provider listener threw an error",
        error,
      );

      unregister();

      expect(composite.getModelContext().system).toBeUndefined();
      expect(laterSubscriber).toHaveBeenCalledTimes(2);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("rolls back providers that fail to subscribe", () => {
    const composite = new CompositeContextProvider();
    const error = new Error("subscription failed");

    expect(() =>
      composite.registerModelContextProvider({
        getModelContext: () => ({ system: "provider instructions" }),
        subscribe: () => {
          throw error;
        },
      }),
    ).toThrow(error);

    expect(composite.getModelContext().system).toBeUndefined();
  });
});
