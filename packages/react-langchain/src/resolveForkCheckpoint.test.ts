import { describe, expect, it, vi } from "vitest";
import type { LangChainBaseMessage } from "./types";
import type { ForkCheckpointClient } from "./findForkCheckpointInHistory";
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

  it("finds the checkpoint before a source message that is not the head", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("h1"), msg("a1")] },
        checkpoint: { checkpoint_id: "cp-before-h2" },
      },
    ]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1"), msg("a1"), msg("h2"), msg("a2")],
      "a1",
      "h2",
      metadata({ a2: "cp-head" }),
      "messages",
    );

    expect(result).toBe("cp-before-h2");
    expect(client.threads.getHistory).toHaveBeenCalled();
  });

  it("uses the edited source boundary after a joined multi-tool assistant turn", async () => {
    const ids = [
      "h-hi",
      "a-hi",
      "h-copy",
      "ai-a",
      "tool-a",
      "ai-b",
      "tool-b",
      "ai-c",
      "tool-c",
      "ai-summary",
      "h-followup",
      "a-followup",
    ];
    const messages = ids.map(msg);
    const client = makeClient([
      {
        values: { messages },
        checkpoint: { checkpoint_id: "cp-after-followup" },
      },
      {
        values: { messages: messages.slice(0, 10) },
        checkpoint: { checkpoint_id: "cp-before-followup" },
      },
      {
        values: { messages: messages.slice(0, 4) },
        checkpoint: { checkpoint_id: "cp-after-first-ai" },
      },
    ]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      messages,
      "ai-a",
      "h-followup",
      undefined,
      "messages",
    );

    expect(result).toBe("cp-before-followup");
  });

  it("falls back to the parent checkpoint when a cancellation stub shares the edited message's step", async () => {
    const messages: LangChainBaseMessage[] = [
      msg("h1"),
      {
        ...msg("ai1"),
        _getType: () => "ai",
        tool_calls: [{ id: "call-1", name: "lookup", args: {} }],
      },
      {
        ...msg("cancel-stub"),
        _getType: () => "tool",
        tool_call_id: "call-1",
      },
      msg("h2"),
      { ...msg("a2"), _getType: () => "ai" },
    ];
    const client = makeClient([
      {
        values: { messages },
        checkpoint: { checkpoint_id: "cp-a2" },
      },
      {
        values: { messages: messages.slice(0, 4) },
        checkpoint: { checkpoint_id: "cp-h2" },
      },
      {
        values: { messages: messages.slice(0, 2) },
        checkpoint: { checkpoint_id: "cp-ai1" },
      },
    ]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      messages,
      "ai1",
      "h2",
      undefined,
      "messages",
    );

    expect(result).toBe("cp-ai1");
  });

  it("falls back to history search when the head metadata has no checkpoint", async () => {
    const client = makeClient([
      {
        values: { messages: [msg("h1")] },
        checkpoint: { checkpoint_id: "cp-h1" },
      },
    ]);

    const result = await resolveForkCheckpoint(
      client,
      "thread-1",
      [msg("h1"), msg("a1")],
      "h1",
      "a1",
      metadata({}),
      "messages",
    );

    expect(result).toBe("cp-h1");
    expect(client.threads.getHistory).toHaveBeenCalled();
  });

  it("matches the parent prefix through history search", async () => {
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

  it("swallows history search errors and returns null", async () => {
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
