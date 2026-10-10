import { describe, expect, it, vi } from "vitest";
import { createOpenCodeThreadListAdapter } from "./openCodeThreadListAdapter";
import { rejectWhenThrowing } from "./testUtils";

const readChunks = async (stream: ReadableStream<unknown>) => {
  const chunks: unknown[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
};

describe("createOpenCodeThreadListAdapter", () => {
  it("propagates list errors returned by the OpenCode SDK", async () => {
    const error = new Error("Unauthorized");
    const list = rejectWhenThrowing(error);
    const adapter = createOpenCodeThreadListAdapter(
      { experimental: { session: { list } } } as never,
      () => undefined,
    );

    await expect(adapter.list()).rejects.toBe(error);
    expect(list).toHaveBeenCalledWith(
      { roots: true, archived: true },
      { throwOnError: true },
    );
  });

  it("propagates mutation errors returned by the OpenCode SDK", async () => {
    const error = new Error("Session not found");
    const update = rejectWhenThrowing(error);
    const adapter = createOpenCodeThreadListAdapter(
      { session: { update } } as never,
      () => undefined,
    );

    await expect(adapter.rename("session-1", "New title")).rejects.toBe(error);
    expect(update).toHaveBeenCalledWith(
      { sessionID: "session-1", title: "New title" },
      { throwOnError: true },
    );
  });

  it("streams the title the session already has without asking OpenCode for one", async () => {
    const summarize = vi.fn();
    const adapter = createOpenCodeThreadListAdapter(
      { session: { summarize } } as never,
      (sessionId) =>
        sessionId === "session-1" ? "Fix the login redirect" : undefined,
    );

    const chunks = await readChunks(await adapter.generateTitle("session-1"));

    expect(summarize).not.toHaveBeenCalled();
    expect(chunks).toContainEqual({
      type: "text-delta",
      path: [0],
      textDelta: "Fix the login redirect",
    });
  });

  it("streams nothing for a default or unknown session title", async () => {
    const adapter = createOpenCodeThreadListAdapter({} as never, (sessionId) =>
      sessionId === "session-1"
        ? "New session - 2026-10-10T15:00:51.077Z"
        : undefined,
    );

    await expect(
      readChunks(await adapter.generateTitle("session-1")),
    ).resolves.toEqual([]);
    await expect(
      readChunks(await adapter.generateTitle("session-2")),
    ).resolves.toEqual([]);
  });
});
