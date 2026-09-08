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
  it("reports title generation failures", async () => {
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
      expect(itemRuntime.generateTitle).toHaveBeenCalledWith({
        automatic: true,
      });
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Thread title generation failed",
        error,
      );
    });
  });

  it("waits for the first message before generating", async () => {
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
      generateTitle: vi.fn(async () => {}),
    } as unknown as ThreadListItemRuntime;

    subscribeToTitleGeneration(runtime.thread, itemRuntime);
    expect(itemRuntime.generateTitle).not.toHaveBeenCalled();

    const message: AppendMessage = {
      parentId: null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(),
      startRun: false,
    };
    await core.threads.getMainThreadRuntimeCore().append(message);

    await vi.waitFor(() => {
      expect(itemRuntime.generateTitle).toHaveBeenCalledOnce();
      expect(itemRuntime.generateTitle).toHaveBeenCalledWith({
        automatic: true,
      });
    });
  });

  it("generates immediately when a message already exists", async () => {
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
      generateTitle: vi.fn(async () => {}),
    } as unknown as ThreadListItemRuntime;

    const message: AppendMessage = {
      parentId: null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(),
      startRun: false,
    };
    await core.threads.getMainThreadRuntimeCore().append(message);

    subscribeToTitleGeneration(runtime.thread, itemRuntime);

    await vi.waitFor(() => {
      expect(itemRuntime.generateTitle).toHaveBeenCalledOnce();
      expect(itemRuntime.generateTitle).toHaveBeenCalledWith({
        automatic: true,
      });
    });
  });
});
