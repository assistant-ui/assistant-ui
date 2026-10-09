import { afterEach, describe, expect, it, vi } from "vitest";
import { DevToolsHooks, DevToolsProviderApi } from "./DevToolsHooks";

describe("DevToolsHooks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("notifies every listener when one throws", () => {
    const error = new Error("listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const laterListener = vi.fn();
    const unsubscribeThrowing = DevToolsHooks.subscribe(() => {
      throw error;
    });
    const unsubscribeLater = DevToolsHooks.subscribe(laterListener);
    let unregister = () => {};

    try {
      unregister = DevToolsProviderApi.register({});
      const apiId = [...DevToolsHooks.getApis().keys()].at(-1);
      expect(apiId).toBeDefined();

      DevToolsHooks.clearEventLogs(apiId!);

      expect(laterListener).toHaveBeenCalledTimes(2);
      expect(consoleError).toHaveBeenCalledTimes(2);
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] DevTools listener threw an error",
        error,
      );
    } finally {
      unsubscribeThrowing();
      unsubscribeLater();
      unregister();
    }
  });
});
