import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";
import type { ThreadListItemRuntime } from "../../runtime/api/thread-list-item-runtime";
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";
import type { AppendMessage } from "../../types/message";
import { subscribeToTitleGeneration } from "./RemoteThreadResource";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("subscribeToTitleGeneration", () => {
  it("reports title generation failures through the runtime event boundary", async () => {
    const error = new Error("title unavailable");
    const core = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return { content: [{ type: "text", text: "done" }] };
            },
          },
        },
        unstable_humanToolNames: [],
      },
      undefined,
    );
    const runtime = new AssistantRuntimeImpl(core);
    const itemRuntime = {
      generateTitle: vi.fn(async () => {
        throw error;
      }),
    } as unknown as ThreadListItemRuntime;
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    subscribeToTitleGeneration(runtime.thread, itemRuntime);
    const message: AppendMessage = {
      parentId: null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(),
    };

    await expect(
      core.threads.getMainThreadRuntimeCore().append(message),
    ).resolves.toBeUndefined();

    await vi.waitFor(() => {
      expect(itemRuntime.generateTitle).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith(
        '[assistant-ui] Runtime event "runEnd" listener threw an error',
        error,
      );
    });
  });
});
