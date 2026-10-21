import { afterEach, describe, expect, it, vi } from "vitest";
import { createInProcessClient } from "./createInProcessClient";

const { registry, projectApi } = vi.hoisted(() => {
  const callbacks = new Set<() => void>();
  return {
    registry: {
      callbacks,
      getApis: vi.fn(() => new Map([[1, { api: {}, logs: [] }]])),
      subscribe: vi.fn((callback: () => void) => {
        callbacks.add(callback);
        return () => callbacks.delete(callback);
      }),
    },
    projectApi: vi.fn((id: number) => ({ id, state: {}, logs: [] })),
  };
});

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  DevToolsHooks: registry,
}));

vi.mock("./projectApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./projectApi")>()),
  projectApi,
}));

describe("createInProcessClient", () => {
  afterEach(() => {
    registry.callbacks.clear();
    vi.restoreAllMocks();
  });

  it("shares projection and the registry subscription across listeners", () => {
    const client = createInProcessClient();
    const first = vi.fn();
    const second = vi.fn();

    const unsubscribeFirst = client.subscribe(first);
    const unsubscribeSecond = client.subscribe(second);
    expect(registry.subscribe).toHaveBeenCalledTimes(1);
    expect(registry.callbacks.size).toBe(1);
    expect(projectApi).toHaveBeenCalledTimes(1);

    for (const callback of registry.callbacks) callback();
    expect(projectApi).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    expect(registry.callbacks.size).toBe(1);
    for (const callback of registry.callbacks) callback();
    expect(projectApi).toHaveBeenCalledTimes(3);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);

    unsubscribeSecond();
    expect(registry.callbacks.size).toBe(0);
  });

  it("keeps notifying the other listeners when one throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const client = createInProcessClient();
    const failure = new Error("listener failed");
    const second = vi.fn();
    client.subscribe(() => {
      throw failure;
    });
    client.subscribe(second);

    for (const callback of registry.callbacks) callback();

    expect(second).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] DevTools listener threw an error",
      failure,
    );
  });

  it("notifies only the listeners subscribed when the change arrives", () => {
    const client = createInProcessClient();
    let unsubscribeSecond = () => {};
    const late = vi.fn();
    const second = vi.fn();
    client.subscribe(() => {
      unsubscribeSecond();
      client.subscribe(late);
    });
    unsubscribeSecond = client.subscribe(second);

    for (const callback of registry.callbacks) callback();

    expect(second).not.toHaveBeenCalled();
    expect(late).not.toHaveBeenCalled();
  });
});
