import { describe, expect, it, vi } from "vitest";
import { ModelContextRegistry } from "./registry";

describe("ModelContextRegistry", () => {
  it.each(["__proto__", "constructor", "toString"])(
    "retains a tool named %s",
    (toolName) => {
      const registry = new ModelContextRegistry();
      registry.addTool({ toolName });

      const tools = registry.getModelContext().tools!;
      expect(Object.hasOwn(tools, toolName)).toBe(true);
      expect(Object.keys(tools)).toEqual([toolName]);
    },
  );

  it("notifies every subscriber and rethrows when a registration subscriber throws", () => {
    const registry = new ModelContextRegistry();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();

    registry.subscribe(() => {
      throw error;
    });
    registry.subscribe(laterSubscriber);

    expect(() => registry.addTool({ toolName: "search" })).toThrow(error);

    expect(registry.getModelContext().tools).toHaveProperty("search");
    expect(laterSubscriber).toHaveBeenCalledTimes(1);
  });

  it("keeps a provider registered when a registration subscriber throws", () => {
    const registry = new ModelContextRegistry();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();

    registry.subscribe(() => {
      throw error;
    });
    registry.subscribe(laterSubscriber);

    expect(() =>
      registry.addProvider({
        getModelContext: () => ({ system: "provider instructions" }),
      }),
    ).toThrow(error);

    expect(registry.getModelContext().system).toBe("provider instructions");
    expect(laterSubscriber).toHaveBeenCalledTimes(1);
  });

  it("notifies every subscriber and rethrows when registering instructions", () => {
    const registry = new ModelContextRegistry();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();

    registry.subscribe(() => {
      throw error;
    });
    registry.subscribe(laterSubscriber);

    expect(() => registry.addInstruction("be concise")).toThrow(error);

    expect(registry.getModelContext().system).toContain("be concise");
    expect(laterSubscriber).toHaveBeenCalledTimes(1);
  });

  it("rethrows the provider subscription failure when a rollback subscriber throws", () => {
    const registry = new ModelContextRegistry();
    const subscriptionError = new Error("subscription failed");
    const subscriberError = new Error("subscriber failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    registry.subscribe(() => {
      throw subscriberError;
    });

    try {
      expect(() =>
        registry.addProvider({
          getModelContext: () => ({ system: "provider instructions" }),
          subscribe: () => {
            throw subscriptionError;
          },
        }),
      ).toThrow(subscriptionError);

      expect(registry.getModelContext().system).toBeUndefined();
      expect(consoleError).toHaveBeenCalledWith(subscriberError);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("rolls back providers that fail to subscribe", () => {
    const registry = new ModelContextRegistry();
    const error = new Error("subscription failed");
    const observedSystems: Array<string | undefined> = [];

    registry.subscribe(() => {
      observedSystems.push(registry.getModelContext().system);
    });

    expect(() =>
      registry.addProvider({
        getModelContext: () => ({ system: "provider instructions" }),
        subscribe: (callback) => {
          callback();
          throw error;
        },
      }),
    ).toThrow(error);

    expect(registry.getModelContext().system).toBeUndefined();
    expect(observedSystems).toEqual(["provider instructions", undefined]);
  });

  it("notifies every subscriber and rethrows on provider updates", () => {
    const registry = new ModelContextRegistry();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();
    let publishUpdate = () => {};

    registry.addProvider({
      getModelContext: () => ({ system: "provider instructions" }),
      subscribe: (callback) => {
        publishUpdate = callback;
        return () => {};
      },
    });

    registry.subscribe(() => {
      throw error;
    });
    registry.subscribe(laterSubscriber);

    expect(() => publishUpdate()).toThrow(error);
    expect(laterSubscriber).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers exactly once when a provider changes", () => {
    const registry = new ModelContextRegistry();
    const callbacks = new Set<() => void>();
    const subscriber = vi.fn();

    registry.addProvider({
      getModelContext: () => ({ system: "provider instructions" }),
      subscribe: (callback) => {
        callbacks.add(callback);
        return () => callbacks.delete(callback);
      },
    });
    registry.subscribe(subscriber);

    for (const callback of callbacks) {
      callback();
    }

    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it("removes a provider's context and subscription through the addProvider handle", () => {
    const registry = new ModelContextRegistry();
    const unsubscribe = vi.fn();

    const handle = registry.addProvider({
      getModelContext: () => ({ system: "provider instructions" }),
      subscribe: () => unsubscribe,
    });
    expect(registry.getModelContext().system).toContain(
      "provider instructions",
    );

    const subscriber = vi.fn();
    registry.subscribe(subscriber);
    handle.remove();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(registry.getModelContext().system ?? "").not.toContain(
      "provider instructions",
    );
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});
