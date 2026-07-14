import { describe, it, expect, vi } from "vitest";
import { createOpenCodeThreadListAdapter } from "./openCodeThreadListAdapter";

describe("createOpenCodeThreadListAdapter", () => {
  it("includes the requested source message when it is the latest message", async () => {
    const client = {
      session: {
        messages: vi.fn().mockResolvedValue({
          data: [{ info: { id: "msg_1" }, parts: [] }],
        }),
        fork: vi.fn().mockResolvedValue({ data: { id: "ses_fork" } }),
      },
      experimental: {
        session: {
          list: vi.fn(),
        },
      },
    };
    const adapter = createOpenCodeThreadListAdapter(client as never);

    await expect(
      adapter.fork("ses_1", { fromMessageId: "msg_1" }),
    ).resolves.toEqual({
      remoteId: "ses_fork",
      externalId: "ses_fork",
    });
    expect(client.session.messages).toHaveBeenCalledWith({
      sessionID: "ses_1",
    });
    expect(client.session.fork).toHaveBeenCalledWith({
      sessionID: "ses_1",
    });
  });

  it("uses the next message as OpenCode's exclusive fork boundary", async () => {
    const client = {
      session: {
        messages: vi.fn().mockResolvedValue({
          data: [
            { info: { id: "msg_1" }, parts: [] },
            { info: { id: "msg_2" }, parts: [] },
          ],
        }),
        fork: vi.fn().mockResolvedValue({ data: { id: "ses_fork" } }),
      },
      experimental: {
        session: {
          list: vi.fn(),
        },
      },
    };
    const adapter = createOpenCodeThreadListAdapter(client as never);

    await adapter.fork("ses_1", { fromMessageId: "msg_1" });

    expect(client.session.fork).toHaveBeenCalledWith({
      sessionID: "ses_1",
      messageID: "msg_2",
    });
  });

  it("rejects fork when the source message is not in OpenCode history", async () => {
    const client = {
      session: {
        messages: vi.fn().mockResolvedValue({ data: [] }),
        fork: vi.fn(),
      },
      experimental: {
        session: {
          list: vi.fn(),
        },
      },
    };
    const adapter = createOpenCodeThreadListAdapter(client as never);

    await expect(
      adapter.fork("ses_1", { fromMessageId: "msg_missing" }),
    ).rejects.toThrow("OpenCode fork source message not found");
    expect(client.session.fork).not.toHaveBeenCalled();
  });

  it("rejects fork without a source message id", async () => {
    const adapter = createOpenCodeThreadListAdapter({
      session: { messages: vi.fn(), fork: vi.fn() },
      experimental: { session: { list: vi.fn() } },
    } as never);

    await expect(adapter.fork("ses_1")).rejects.toThrow(
      "OpenCode fork requires a source message id",
    );
  });
});
