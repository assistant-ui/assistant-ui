import { describe, expect, it, vi } from "vitest";
import type { LangChainBaseMessage } from "./types";
import { resolveForkCheckpointId } from "./resolveForkCheckpointId";

const msg = (id: string | undefined): LangChainBaseMessage => ({
  _getType: () => "human",
  content: "",
  id,
});

const makeClient = (history: unknown[]) => ({
  threads: {
    getHistory: vi.fn(async () => history as never),
  },
});

describe("resolveForkCheckpointId", () => {
  it("returns the checkpoint_id of the state whose messages match by id", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("a"), msg("b"), msg("c")] },
        checkpoint: { checkpoint_id: "cp-too-long" },
      },
      {
        values: { messages: [msg("a"), msg("b")] },
        checkpoint: { checkpoint_id: "cp-match" },
      },
      {
        values: { messages: [msg("a")] },
        checkpoint: { checkpoint_id: "cp-too-short" },
      },
    ]);

    const result = await resolveForkCheckpointId(
      client,
      "thread-1",
      [msg("a"), msg("b")],
      "messages",
    );

    expect(result).toBe("cp-match");
    expect(client.threads.getHistory).toHaveBeenCalledWith("thread-1");
  });

  it("returns null when no state has the same message ids", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("a"), msg("x")] },
        checkpoint: { checkpoint_id: "cp-1" },
      },
    ]);

    const result = await resolveForkCheckpointId(
      client,
      "thread-1",
      [msg("a"), msg("b")],
      "messages",
    );

    expect(result).toBeNull();
  });

  it("returns null when message ids are unstable (missing)", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("a"), msg(undefined)] },
        checkpoint: { checkpoint_id: "cp-1" },
      },
    ]);

    const result = await resolveForkCheckpointId(
      client,
      "thread-1",
      [msg("a"), msg(undefined)],
      "messages",
    );

    expect(result).toBeNull();
  });

  it("reads messages from a custom messagesKey", async () => {
    const client = makeClient([
      {
        values: { history: [msg("a")] },
        checkpoint: { checkpoint_id: "cp-custom" },
      },
    ]);

    const result = await resolveForkCheckpointId(
      client,
      "thread-1",
      [msg("a")],
      "history",
    );

    expect(result).toBe("cp-custom");
  });

  it("returns null when the matching checkpoint has no checkpoint_id", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("a")] },
        checkpoint: {},
      },
    ]);

    const result = await resolveForkCheckpointId(
      client,
      "thread-1",
      [msg("a")],
      "messages",
    );

    expect(result).toBeNull();
  });
});
