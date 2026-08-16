import { describe, expect, it, vi } from "vitest";
import { ChatRegistry } from "./ChatRegistry";

describe("ChatRegistry", () => {
  it("attempts to stop every chat when one stop rejects", async () => {
    const firstStop = vi.fn().mockRejectedValue(new Error("stop failed"));
    const secondStop = vi.fn().mockResolvedValue(undefined);
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

    await expect(registry.stopAll()).resolves.toBeUndefined();

    expect(firstStop).toHaveBeenCalledOnce();
    expect(secondStop).toHaveBeenCalledOnce();
  });
});
