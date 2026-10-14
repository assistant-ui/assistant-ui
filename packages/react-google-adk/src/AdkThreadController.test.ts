import { describe, expect, it, vi } from "vitest";
import { AdkThreadController } from "./AdkThreadController";

describe("AdkThreadController", () => {
  it("selects staged messages through a parent in transcript order", () => {
    const controller = new AdkThreadController();
    const first = { id: "first", type: "human" as const, content: "one" };
    const second = { id: "second", type: "human" as const, content: "two" };
    const later = { id: "later", type: "human" as const, content: "three" };
    controller.dispatch({
      type: "staged.stage",
      entry: { message: first, runConfig: { custom: { source: "first" } } },
    });
    controller.dispatch({
      type: "staged.stage",
      entry: { message: second, runConfig: { custom: { source: "second" } } },
    });
    controller.dispatch({
      type: "staged.stage",
      entry: { message: later, runConfig: undefined },
    });

    expect(controller.getStagedMessageCount()).toBe(3);
    expect(
      controller.getStagedRun("second", [
        second,
        { id: "canonical", type: "ai", content: "reply" },
        first,
        later,
      ]),
    ).toEqual({
      messages: [second],
      runConfig: { custom: { source: "second" } },
    });
    expect(
      controller.getStagedRun("later", [
        second,
        { id: "canonical", type: "ai", content: "reply" },
        first,
        later,
      ])?.messages,
    ).toEqual([second, first, later]);
    expect(controller.getStagedRun("canonical", [first, second])).toBeNull();

    controller.dispatch({ type: "staged.unstage", ids: ["first", "second"] });
    expect(controller.getStagedMessageCount()).toBe(1);
  });

  it("notifies for staging but not for unstaging an absent id", () => {
    const controller = new AdkThreadController();
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.dispatch({
      type: "staged.stage",
      entry: {
        message: { id: "first", type: "human", content: "one" },
        runConfig: undefined,
      },
    });
    expect(listener).toHaveBeenCalledTimes(1);

    controller.dispatch({ type: "staged.unstage", ids: ["missing"] });
    expect(listener).toHaveBeenCalledTimes(1);
  });

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
