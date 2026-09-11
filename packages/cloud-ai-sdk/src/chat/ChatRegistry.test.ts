import { describe, expect, it, vi } from "vitest";
import { ChatRegistry } from "./ChatRegistry";

describe("ChatRegistry", () => {
  it("waits for every stop when one stop rejects", async () => {
    const firstStop = vi.fn().mockRejectedValue(new Error("stop failed"));
    let resolveSecond!: () => void;
    const secondPending = new Promise<void>((resolve) => {
      resolveSecond = resolve;
    });
    const secondStop = vi.fn().mockReturnValue(secondPending);
    const stopByKey = new Map([
      ["first", firstStop],
      ["second", secondStop],
    ]);
    const registry = new ChatRegistry(
      (chatKey) =>
        ({
          id: chatKey,
          messages: [],
          stop: stopByKey.get(chatKey),
        }) as never,
    );
    registry.getOrCreate("first");
    registry.getOrCreate("second");

    const stopAll = registry.stopAll();
    let stopAllSettled = false;
    void stopAll.then(() => {
      stopAllSettled = true;
    });

    expect(registry.isDisposed).toBe(true);
    expect(registry.get("first")).toBeDefined();
    expect(registry.get("second")).toBeDefined();
    expect(registry.stopAll()).toBe(stopAll);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(firstStop).toHaveBeenCalledOnce();
    expect(secondStop).toHaveBeenCalledOnce();
    expect(stopAllSettled).toBe(false);

    resolveSecond();
    await expect(stopAll).resolves.toBeUndefined();
    expect(stopAllSettled).toBe(true);
  });
});
