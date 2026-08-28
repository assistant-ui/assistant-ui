import { describe, it, expect, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type { AppendMessage, ThreadHistoryAdapter } from "@assistant-ui/core";
import { AgUiThreadRuntimeCore } from "./AgUiThreadRuntimeCore";
import { makeLogger } from "./logger";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function createCore(history?: ThreadHistoryAdapter) {
  const agent = {} as AbstractAgent;
  const notifyUpdate = vi.fn();
  const core = new AgUiThreadRuntimeCore({
    agent,
    logger: makeLogger(),
    showThinking: true,
    ...(history && { history }),
    notifyUpdate,
  });
  const update = (nextHistory?: ThreadHistoryAdapter) =>
    core.updateOptions({
      agent,
      logger: makeLogger(),
      showThinking: true,
      ...(nextHistory && { history: nextHistory }),
    });
  return { core, update };
}

function createHistory() {
  return {
    load: vi.fn().mockResolvedValue({
      headId: "restored",
      messages: [
        {
          parentId: null,
          message: {
            id: "restored",
            role: "user" as const,
            content: [{ type: "text" as const, text: "hello" }],
            createdAt: new Date(0),
            metadata: { custom: {} },
          },
        },
      ],
    }),
    append: vi.fn().mockResolvedValue(undefined),
  };
}

const userMessage = (text: string) =>
  ({
    parentId: null,
    role: "user",
    content: [{ type: "text", text }],
    startRun: false,
  }) as unknown as AppendMessage;

describe("AgUiThreadRuntimeCore late history loading", () => {
  it("loads history when the adapter arrives after the first load", async () => {
    const { core, update } = createCore();
    const history = createHistory();

    await core.__internal_load();
    expect(history.load).not.toHaveBeenCalled();
    expect(core.getMessages()).toEqual([]);

    update(history);
    await flush();

    expect(history.load).toHaveBeenCalledOnce();
    expect(core.getMessages().map((message) => message.id)).toEqual([
      "restored",
    ]);
    expect(core.isLoading).toBe(false);
  });

  it("does not load late history over a thread that already has messages", async () => {
    const { core, update } = createCore();
    const history = createHistory();

    await core.__internal_load();
    await core.append(userMessage("typed"));
    expect(core.getMessages()).toHaveLength(1);

    update(history);
    await flush();

    expect(history.load).not.toHaveBeenCalled();
    expect(core.getMessages()).toHaveLength(1);
  });

  it("does not reload when the adapter is replaced after a completed load", async () => {
    const history = createHistory();
    const { core, update } = createCore(history);
    const replacement = createHistory();

    await core.__internal_load();
    expect(history.load).toHaveBeenCalledOnce();

    update(replacement);
    await flush();

    expect(replacement.load).not.toHaveBeenCalled();
  });
});
