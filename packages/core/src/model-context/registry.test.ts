import { describe, expect, it, vi } from "vitest";
import { ModelContextRegistry } from "./registry";

describe("ModelContextRegistry", () => {
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
});
