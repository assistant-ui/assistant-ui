import { describe, it, expect, vi } from "vitest";
import { createOpenCodeThreadListAdapter } from "./openCodeThreadListAdapter";

describe("createOpenCodeThreadListAdapter", () => {
  it("forks a session from the requested source message", async () => {
    const client = {
      session: {
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
    expect(client.session.fork).toHaveBeenCalledWith({
      sessionID: "ses_1",
      messageID: "msg_1",
    });
  });

  it("rejects fork without a source message id", async () => {
    const adapter = createOpenCodeThreadListAdapter({
      session: { fork: vi.fn() },
      experimental: { session: { list: vi.fn() } },
    } as never);

    await expect(adapter.fork("ses_1")).rejects.toThrow(
      "OpenCode fork requires a source message id",
    );
  });
});
