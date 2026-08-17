import { describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadListItemRuntime } from "../../runtime/api/thread-list-item-runtime";
import { notifyEventListeners } from "../../utils/notify-event-listeners";
import { subscribeToTitleGeneration } from "./RemoteThreadResource";

describe("subscribeToTitleGeneration", () => {
  it("reports title generation failures through the runtime event boundary", async () => {
    const error = new Error("title unavailable");
    const titleTask = Promise.reject(error);
    void titleTask.catch(() => undefined);

    let runEndListener: (() => unknown) | undefined;
    const unsubscribe = vi.fn();
    const threadRuntime = {
      unstable_on: vi.fn((_event, listener) => {
        runEndListener = listener;
        return unsubscribe;
      }),
    } as unknown as AssistantRuntime["thread"];
    const itemRuntime = {
      generateTitle: vi.fn(() => titleTask),
    } as unknown as ThreadListItemRuntime;
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    subscribeToTitleGeneration(threadRuntime, itemRuntime);
    notifyEventListeners([runEndListener!], {}, 'Runtime event "runEnd"');
    await titleTask.catch(() => undefined);
    await Promise.resolve();

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      '[assistant-ui] Runtime event "runEnd" listener threw an error',
      error,
    );
  });
});
