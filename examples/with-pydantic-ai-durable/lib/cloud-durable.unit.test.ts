import type {
  ExportedMessageRepository,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/react";
import { describe, expect, it, vi } from "vitest";
import { decideDurableThread, withDurableRuns } from "./cloud-durable";

const message = (
  id: string,
  role: "user" | "assistant",
  text: string,
  status?: ThreadMessage["status"],
): ThreadMessage =>
  ({
    id,
    role,
    content: [{ type: "text", text }],
    createdAt: new Date(0),
    metadata: { custom: {} },
    ...(role === "user"
      ? { attachments: [] }
      : { status: status ?? { type: "complete", reason: "stop" } }),
  }) as ThreadMessage;

const stale = {
  type: "incomplete",
  reason: "error",
  error: { code: "run_stale" },
} as const;
const elsewhere = (staleInMs: number) =>
  ({
    type: "incomplete",
    reason: "error",
    error: { code: "run_in_progress", stale_in_ms: staleInMs },
  }) as const;

const repo = (...messages: ThreadMessage[]): ExportedMessageRepository => ({
  messages: messages.map((m, i) => ({
    message: m,
    parentId: i === 0 ? null : messages[i - 1]!.id,
  })),
});

const firstTurn = [
  message("u1", "user", "hi"),
  message("a1", "assistant", "hello"),
];
const serverFirstTurn = [
  { id: "s-u1", role: "user", content: "hi" },
  { id: "s-a1", role: "assistant", content: "hello" },
];

describe("decideDurableThread", () => {
  it("keeps a thread the server does not know", () => {
    expect(
      decideDurableThread(
        repo(
          message("u1", "user", "hi"),
          message("a1", "assistant", "", stale),
        ),
        null,
      ),
    ).toEqual({ type: "keep" });
  });

  it("keeps a settled reply", () => {
    expect(
      decideDurableThread(repo(...firstTurn), {
        running: true,
        messages: serverFirstTurn.slice(0, 1),
      }),
    ).toEqual({ type: "keep" });
  });

  it("rejoins a running turn matched by position, dropping every reply after the user message", () => {
    const decision = decideDurableThread(
      repo(
        ...firstTurn,
        message("u2", "user", "more"),
        message("a2", "assistant", "par", stale),
      ),
      {
        running: true,
        messages: [
          ...serverFirstTurn,
          { id: "s-u2", role: "user", content: "more" },
        ],
      },
    );
    expect(decision).toMatchObject({ type: "resume", headId: "u2" });
    if (decision.type !== "resume") throw new Error("unreachable");
    expect(decision.remove.map((i) => i.message.id)).toEqual(["a2"]);
    expect(decision.messages.map((i) => i.message.id)).toEqual([
      "u1",
      "a1",
      "u2",
    ]);
  });

  it("rejoins when the user message is last and nothing was stored", () => {
    expect(
      decideDurableThread(repo(message("u1", "user", "hi")), {
        running: true,
        messages: serverFirstTurn.slice(0, 1),
      }),
    ).toMatchObject({ type: "resume", headId: "u1", remove: [] });
  });

  it("leaves a reply another tab is writing to that tab", () => {
    expect(
      decideDurableThread(
        repo(
          message("u1", "user", "hi"),
          message("a1", "assistant", "par", elsewhere(4_000)),
        ),
        { running: true, messages: serverFirstTurn.slice(0, 1) },
      ),
    ).toEqual({ type: "keep" });
  });

  it("rejoins a reply whose stream ended without RUN_FINISHED", () => {
    expect(
      decideDurableThread(
        repo(
          message("u1", "user", "hi"),
          message("a1", "assistant", "par", {
            type: "incomplete",
            reason: "error",
            error: "The connection ended before the answer finished.",
          }),
        ),
        { running: true, messages: serverFirstTurn.slice(0, 1) },
      ),
    ).toMatchObject({ type: "resume", headId: "u1" });
  });

  it("keeps the thread when only one side of the matched user message has text", () => {
    expect(
      decideDurableThread(
        repo(message("u1", "user", ""), message("a1", "assistant", "", stale)),
        {
          running: true,
          messages: [{ id: "s-u1", role: "user", content: "hi" }],
        },
      ),
    ).toEqual({ type: "keep" });
  });

  it("replaces an interrupted reply with the server's answer, chained under the user message", () => {
    const decision = decideDurableThread(
      repo(
        message("u1", "user", "hi"),
        message("a1", "assistant", "he", stale),
      ),
      {
        running: false,
        messages: [
          ...serverFirstTurn,
          { id: "s-a2", role: "assistant", content: "again" },
        ],
      },
    );
    expect(decision).toMatchObject({ type: "replace", headId: "s-a2" });
    if (decision.type !== "replace") throw new Error("unreachable");
    expect(
      decision.add.map((i) => [i.parentId, i.message.id, i.message.role]),
    ).toEqual([
      ["u1", "s-a1", "assistant"],
      ["s-a1", "s-a2", "assistant"],
    ]);
  });

  it("keeps the thread when the server is behind or ahead of the store", () => {
    const stored = repo(
      ...firstTurn,
      message("u2", "user", "more"),
      message("a2", "assistant", "", stale),
    );
    expect(
      decideDurableThread(stored, {
        running: false,
        messages: serverFirstTurn,
      }),
    ).toEqual({ type: "keep" });
    expect(
      decideDurableThread(stored, {
        running: true,
        messages: [
          ...serverFirstTurn,
          { id: "s-u2", role: "user", content: "more" },
          { id: "s-a2", role: "assistant", content: "x" },
          { id: "s-u3", role: "user", content: "newer" },
        ],
      }),
    ).toEqual({ type: "keep" });
  });

  it("keeps the thread when the matched user messages say different things", () => {
    expect(
      decideDurableThread(
        repo(
          message("u1", "user", "hi"),
          message("a1", "assistant", "", stale),
        ),
        {
          running: true,
          messages: [{ id: "s-u1", role: "user", content: "something else" }],
        },
      ),
    ).toEqual({ type: "keep" });
  });

  it("reads the head branch, not the newest message", () => {
    const u1 = message("u1", "user", "hi");
    const old = message("a-old", "assistant", "", stale);
    const settled = message("a-new", "assistant", "done");
    expect(
      decideDurableThread(
        {
          headId: "a-new",
          messages: [
            { message: u1, parentId: null },
            { message: settled, parentId: "u1" },
            { message: old, parentId: "u1" },
          ],
        },
        { running: true, messages: serverFirstTurn.slice(0, 1) },
      ),
    ).toEqual({ type: "keep" });
  });
});

describe("decideDurableThread conversion options", () => {
  const stored = repo(
    message("u1", "user", "hi"),
    message("a1", "assistant", "", stale),
  );
  const server = {
    running: false,
    messages: [
      { id: "s-u1", role: "user", content: "hi" },
      { id: "s-r1", role: "reasoning", content: "thinking it over" },
      {
        id: "s-a1",
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "lookup", arguments: "{}" },
          },
        ],
      },
      { id: "s-t1", role: "tool", toolCallId: "call-1", content: "42" },
      { id: "s-a2", role: "assistant", content: "the answer" },
    ],
  };
  const added = (options: Parameters<typeof decideDurableThread>[2]) => {
    const decision = decideDurableThread(stored, server, options);
    if (decision.type !== "replace") throw new Error(decision.type);
    return decision.add.map((item) => item.message);
  };

  it("hides reasoning when the runtime does", () => {
    const parts = (options?: { showThinking: boolean }) =>
      added(options).flatMap((m) => m.content.map((part) => part.type));
    expect(parts()).toContain("reasoning");
    expect(parts({ showThinking: false })).not.toContain("reasoning");
  });

  it("joins a reply split across records when the runtime does", () => {
    expect(added(undefined)).toHaveLength(2);
    expect(
      added({ joinAdjacentAssistantMessages: true }).map((m) => m.role),
    ).toEqual(["assistant"]);
  });
});

describe("withDurableRuns", () => {
  const stored = repo(
    message("u1", "user", "hi"),
    message("a1", "assistant", "he", stale),
  );
  const finished = {
    running: false,
    messages: [
      ...serverFirstTurn,
      { id: "s-a2", role: "assistant", content: "again" },
    ],
  };
  const agent = { threadId: "t", getThread: async () => finished };

  it("leaves the thread as stored when the history cannot delete", async () => {
    const append = vi.fn();
    const history: ThreadHistoryAdapter = { load: async () => stored, append };
    const loaded = await withDurableRuns(history, agent).load();
    expect(loaded).toBe(stored);
    expect(append).not.toHaveBeenCalled();
  });

  it("takes back a partly stored answer, so the next load stores it again", async () => {
    const del = vi.fn(async (_items: { message: { id: string } }[]) => {});
    const append = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const history: ThreadHistoryAdapter = {
      load: async () => stored,
      append,
      delete: del,
    };
    const loaded = await withDurableRuns(history, agent, {
      joinAdjacentAssistantMessages: false,
    }).load();
    expect(
      del.mock.calls.map(([items]) => items.map((i) => i.message.id)),
    ).toEqual([["a1"], ["s-a1"]]);
    expect(loaded.headId).toBe("u1");
    expect(loaded.messages.map((i) => i.message.id)).toEqual(["u1"]);
  });
});
