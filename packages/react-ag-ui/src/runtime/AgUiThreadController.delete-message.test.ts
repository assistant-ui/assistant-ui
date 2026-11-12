import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type { ThreadHistoryAdapter, ThreadMessage } from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

const user: ThreadMessage = {
  id: "u1",
  role: "user",
  content: [{ type: "text", text: "hi" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

const assistant: ThreadMessage = {
  id: "a1",
  role: "assistant",
  content: [{ type: "text", text: "partial" }],
  status: { type: "incomplete", reason: "cancelled" },
  createdAt: new Date(0),
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
};

describe("AgUiThreadController.deleteMessage", () => {
  it("removes the message and deletes its stored history entry", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const history: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({
        headId: "a1",
        messages: [
          { parentId: null, message: user },
          { parentId: "u1", message: assistant },
        ],
      }),
      append: vi.fn().mockResolvedValue(undefined),
      delete: remove,
    };
    const core = new AgUiThreadController({
      agent: {} as AbstractAgent,
      logger: makeLogger(),
      showThinking: true,
      history,
    });
    await core.__internal_load();
    expect(core.getMessages().map((m) => m.id)).toEqual(["u1", "a1"]);

    await core.deleteMessage("a1");

    expect(core.getMessages().map((m) => m.id)).toEqual(["u1"]);
    expect(remove).toHaveBeenCalledWith([
      { parentId: "u1", message: expect.objectContaining({ id: "a1" }) },
    ]);
  });

  it("ignores an unknown message", async () => {
    const remove = vi.fn();
    const core = new AgUiThreadController({
      agent: {} as AbstractAgent,
      logger: makeLogger(),
      showThinking: true,
      history: { load: vi.fn(), append: vi.fn(), delete: remove },
    });
    await core.deleteMessage("missing");
    expect(remove).not.toHaveBeenCalled();
  });
});
