import { describe, expect, it, vi } from "vitest";
import { AdkThreadController } from "./AdkThreadController";

describe("AdkThreadController", () => {
  it("publishes the reduced state synchronously to subscribers", () => {
    const controller = new AdkThreadController();
    const first = vi.fn(() => controller.getState());
    const second = vi.fn();
    const unsubscribeFirst = controller.subscribe(first);
    controller.subscribe(second);
    const initial = controller.getState();
    const messages = [
      { id: "message-1", type: "human" as const, content: "hi" },
    ];

    controller.dispatch({ type: "messages.set", messages });

    expect(controller.getState()).not.toBe(initial);
    expect(controller.getState().messages).toBe(messages);
    expect(first).toHaveReturnedWith(controller.getState());
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    controller.dispatch({ type: "messages.replaced", messages: [] });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });
});
