import { describe, expect, it, vi } from "vitest";
import type { LangChainBaseMessage } from "./types";
import type { ForkCheckpointClient } from "./resolveForkCheckpointId";
import { resolveForkCheckpoint } from "./resolveForkCheckpoint";

const msg = (id: string): LangChainBaseMessage => ({
  _getType: () => "human",
  content: "",
  id,
});

type HistoryState = {
  values: Record<string, unknown>;
  checkpoint: { checkpoint_id?: string };
};

const makeClient = (history: HistoryState[]): ForkCheckpointClient => ({
  threads: {
    getHistory: vi.fn(async () => history as never),
  },
});

const metadata = (entries: Record<string, string | undefined>) =>
  new Map(
    Object.entries(entries).map(([id, parentCheckpointId]) => [
      id,
      { parentCheckpointId },
    ]),
  );

describe("resolveForkCheckpoint", () => {
  it("uses the head metadata fast-path without hitting getHistory", async () => {
    const client = makeClient([]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1"), msg("a1")],
      "h1",
      "a1",
      metadata({ a1: "cp-head" }),
      "messages",
    );

    expect(result).toBe("cp-head");
    expect(client.threads.getHistory).not.toHaveBeenCalled();
  });

  it("falls back to getHistory when sourceId is not the head message", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("h1")] },
        checkpoint: { checkpoint_id: "cp-h1" },
      },
    ]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1"), msg("a1"), msg("h2")],
      "h1",
      "h1",
      metadata({ h2: "cp-head" }),
      "messages",
    );

    expect(result).toBe("cp-h1");
    expect(client.threads.getHistory).toHaveBeenCalled();
  });

  it("reverse-maps the parent prefix through getHistory", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("h1"), msg("a1")] },
        checkpoint: { checkpoint_id: "cp-full" },
      },
      {
        values: { messages: [msg("h1")] },
        checkpoint: { checkpoint_id: "cp-parent" },
      },
    ]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1"), msg("a1")],
      "h1",
      undefined,
      undefined,
      "messages",
    );

    expect(result).toBe("cp-parent");
  });

  it("returns null when a non-null parentId is not in the messages", async () => {
    const client = makeClient([]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1"), msg("a1")],
      "missing",
      undefined,
      undefined,
      "messages",
    );

    expect(result).toBeNull();
    expect(client.threads.getHistory).not.toHaveBeenCalled();
  });

  it("forks the first message from the initial empty-message checkpoint", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("h1"), msg("a1")] },
        checkpoint: { checkpoint_id: "cp-full" },
      },
      {
        values: { messages: [] },
        checkpoint: { checkpoint_id: "cp-initial" },
      },
    ]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1"), msg("a1")],
      null,
      "h1",
      metadata({}),
      "messages",
    );

    expect(result).toBe("cp-initial");
  });

  it("returns null when no checkpoint resolves", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("other")] },
        checkpoint: { checkpoint_id: "cp-other" },
      },
    ]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1")],
      "h1",
      undefined,
      undefined,
      "messages",
    );

    expect(result).toBeNull();
  });

  it("swallows getHistory errors and returns null", async () => {
    const client: ForkCheckpointClient = {
      threads: {
        getHistory: vi.fn(async () => {
          throw new Error("network");
        }),
      },
    };

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1"), msg("a1")],
      "h1",
      undefined,
      undefined,
      "messages",
    );

    expect(result).toBeNull();
  });
});
