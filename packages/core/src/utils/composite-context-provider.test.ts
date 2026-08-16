import { describe, expect, it, vi } from "vitest";
import { CompositeContextProvider } from "./composite-context-provider";

describe("CompositeContextProvider", () => {
  it("notifies every subscriber and rethrows when a registration subscriber throws", () => {
    const composite = new CompositeContextProvider();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();

    composite.subscribe(() => {
      throw error;
    });
    composite.subscribe(laterSubscriber);

    expect(() =>
      composite.registerModelContextProvider({
        getModelContext: () => ({ system: "provider instructions" }),
      }),
    ).toThrow(error);

    expect(composite.getModelContext().system).toBe("provider instructions");
    expect(laterSubscriber).toHaveBeenCalledTimes(1);
  });

  it("rolls back providers that fail to subscribe", () => {
    const composite = new CompositeContextProvider();
    const error = new Error("subscription failed");
    const observedSystems: Array<string | undefined> = [];

    composite.subscribe(() => {
      observedSystems.push(composite.getModelContext().system);
    });

    expect(() =>
      composite.registerModelContextProvider({
        getModelContext: () => ({ system: "provider instructions" }),
        subscribe: (callback) => {
          callback();
          throw error;
        },
      }),
    ).toThrow(error);

    expect(composite.getModelContext().system).toBeUndefined();
    expect(observedSystems).toEqual(["provider instructions", undefined]);
  });

  it("rethrows the provider subscription failure when a rollback subscriber throws", () => {
    const composite = new CompositeContextProvider();
    const subscriptionError = new Error("subscription failed");
    const subscriberError = new Error("subscriber failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    composite.subscribe(() => {
      throw subscriberError;
    });

    try {
      expect(() =>
        composite.registerModelContextProvider({
          getModelContext: () => ({ system: "provider instructions" }),
          subscribe: () => {
            throw subscriptionError;
          },
        }),
      ).toThrow(subscriptionError);

      expect(composite.getModelContext().system).toBeUndefined();
      expect(consoleError).toHaveBeenCalledWith(subscriberError);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("preserves an earlier registration when a duplicate fails to subscribe", () => {
    const composite = new CompositeContextProvider();
    const error = new Error("subscription failed");
    let subscriptionCount = 0;
    const provider = {
      getModelContext: () => ({ system: "provider instructions" }),
      subscribe: () => {
        subscriptionCount++;
        if (subscriptionCount === 2) throw error;
        return () => {};
      },
    };

    const unregister = composite.registerModelContextProvider(provider);

    expect(() => composite.registerModelContextProvider(provider)).toThrow(
      error,
    );
    expect(composite.getModelContext().system).toBe("provider instructions");

    unregister();
    expect(composite.getModelContext().system).toBeUndefined();
  });

  it("notifies every subscriber and rethrows on provider updates", () => {
    const composite = new CompositeContextProvider();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();
    let publishUpdate = () => {};

    composite.registerModelContextProvider({
      getModelContext: () => ({ system: "provider instructions" }),
      subscribe: (callback) => {
        publishUpdate = callback;
        return () => {};
      },
    });

    composite.subscribe(() => {
      throw error;
    });
    composite.subscribe(laterSubscriber);

    expect(() => publishUpdate()).toThrow(error);
    expect(laterSubscriber).toHaveBeenCalledTimes(1);
  });
});
