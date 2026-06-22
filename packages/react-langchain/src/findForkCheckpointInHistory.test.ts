import { describe, expect, it, vi } from "vitest";
import type { LangChainBaseMessage } from "./types";
import { findForkCheckpointInHistory } from "./findForkCheckpointInHistory";

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

type HistoryState = {
  values: Record<string, unknown>;
  checkpoint: { checkpoint_id?: string };
};

const makePaginatedClient = (states: HistoryState[]) => ({
  threads: {
    getHistory: vi.fn(
      async (
        _threadId: string,
        options?: {
          limit?: number;
          before?: { configurable: { checkpoint_id: string } };
        },
      ) => {
        const limit = options?.limit ?? 10;
        const beforeId = options?.before?.configurable.checkpoint_id;
        const start = beforeId
          ? states.findIndex((s) => s.checkpoint.checkpoint_id === beforeId) + 1
          : 0;
        return states.slice(start, start + limit) as never;
      },
    ),
  },
});

describe("findForkCheckpointInHistory", () => {
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

    const result = await findForkCheckpointInHistory(
      client,
      "thread-1",
      [msg("a"), msg("b")],
      "messages",
    );

    expect(result).toBe("cp-match");
    expect(client.threads.getHistory).toHaveBeenCalledWith("thread-1", {
      limit: 100,
    });
  });

  it("returns null when no state has the same message ids", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("a"), msg("x")] },
        checkpoint: { checkpoint_id: "cp-1" },
      },
    ]);

    const result = await findForkCheckpointInHistory(
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

    const result = await findForkCheckpointInHistory(
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

    const result = await findForkCheckpointInHistory(
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

    const result = await findForkCheckpointInHistory(
      client,
      "thread-1",
      [msg("a")],
      "messages",
    );

    expect(result).toBeNull();
  });

  it("keeps scanning when a matching state has no checkpoint_id", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("a")] },
        checkpoint: {},
      },
      {
        values: { messages: [msg("a")] },
        checkpoint: { checkpoint_id: "cp-second" },
      },
    ]);

    const result = await findForkCheckpointInHistory(
      client,
      "thread-1",
      [msg("a")],
      "messages",
    );

    expect(result).toBe("cp-second");
  });

  it("does not throw when a state's messages payload is not an array", async () => {
    const client = makeClient([
      {
        values: { messages: "ab" },
        checkpoint: { checkpoint_id: "cp-1" },
      },
    ]);

    const result = await findForkCheckpointInHistory(
      client,
      "thread-1",
      [msg("a"), msg("b")],
      "messages",
    );

    expect(result).toBeNull();
  });

  it("forwards a custom history limit to getHistory", async () => {
    const client = makeClient([]);

    await findForkCheckpointInHistory(
      client,
      "thread-1",
      [msg("a")],
      "messages",
      25,
    );

    expect(client.threads.getHistory).toHaveBeenCalledWith("thread-1", {
      limit: 25,
    });
  });

  it("pages through history to find a match beyond the first page", async () => {
    const client = makePaginatedClient([
      {
        values: { messages: [msg("a"), msg("b"), msg("c"), msg("d")] },
        checkpoint: { checkpoint_id: "cp-4" },
      },
      {
        values: { messages: [msg("a"), msg("b"), msg("c")] },
        checkpoint: { checkpoint_id: "cp-3" },
      },
      {
        values: { messages: [msg("a"), msg("b")] },
        checkpoint: { checkpoint_id: "cp-2" },
      },
      {
        values: { messages: [msg("a")] },
        checkpoint: { checkpoint_id: "cp-1" },
      },
    ]);

    const result = await findForkCheckpointInHistory(
      client,
      "thread-1",
      [msg("a")],
      "messages",
      2,
    );

    expect(result).toBe("cp-1");
    expect(client.threads.getHistory).toHaveBeenCalledTimes(2);
    expect(client.threads.getHistory).toHaveBeenLastCalledWith("thread-1", {
      limit: 2,
      before: { configurable: { checkpoint_id: "cp-3" } },
    });
  });

  it("stops instead of looping when the cursor does not advance", async () => {
    const page = [
      {
        values: { messages: [msg("x"), msg("y")] },
        checkpoint: { checkpoint_id: "cp-1" },
      },
      {
        values: { messages: [msg("x")] },
        checkpoint: { checkpoint_id: "cp-2" },
      },
    ];
    const client = {
      threads: { getHistory: vi.fn(async () => page as never) },
    };

    const result = await findForkCheckpointInHistory(
      client,
      "thread-1",
      [msg("a")],
      "messages",
      2,
    );

    expect(result).toBeNull();
    expect(client.threads.getHistory).toHaveBeenCalledTimes(2);
  });
});
