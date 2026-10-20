// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { LangGraphThreadController } from "./LangGraphThreadController";

describe("LangGraphThreadController", () => {
  it("publishes changed state synchronously and skips identical state", () => {
    const controller = new LangGraphThreadController();
    const listener = vi.fn();
    const unsubscribe = controller.subscribeState(listener);
    const initial = controller.getState();
    const entry = {
      message: { type: "human" as const, id: "draft", content: "hello" },
      runConfig: undefined,
    };

    const staged = controller.dispatch({ type: "staged.set", entry });
    expect(controller.getState()).toBe(staged);
    expect(staged.stagedMessages.get("draft")).toBe(entry);
    expect(initial.stagedMessages.size).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);

    expect(
      controller.dispatch({ type: "staged.remove", ids: ["missing"] }),
    ).toBe(staged);
    expect(listener).toHaveBeenCalledTimes(1);

    controller.dispatch({ type: "staged.remove", ids: ["draft"] });
    expect(controller.getState().stagedMessages.size).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    controller.dispatch({ type: "transcripts.add", ids: ["spoken"] });
    expect(controller.getState().unsentTranscriptIds.has("spoken")).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps the queued reply snapshot stable for unrelated state changes", () => {
    const controller = new LangGraphThreadController();
    const queuedReplyIds = controller.getQueuedReplyIds();
    controller.dispatch({ type: "transcripts.add", ids: ["spoken"] });
    expect(controller.getQueuedReplyIds()).toBe(queuedReplyIds);
  });
});
