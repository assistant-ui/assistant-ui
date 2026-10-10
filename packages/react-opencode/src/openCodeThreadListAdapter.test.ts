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
    const adapter = createOpenCodeThreadListAdapter({
      experimental: { session: { list } },
    } as never);

    await expect(adapter.list()).rejects.toBe(error);
    expect(list).toHaveBeenCalledWith(
      { roots: true, archived: true },
      { throwOnError: true },
    );
  });

  it("propagates mutation errors returned by the OpenCode SDK", async () => {
    const error = new Error("Session not found");
    const update = rejectWhenThrowing(error);
    const adapter = createOpenCodeThreadListAdapter({
      session: { update },
    } as never);

    await expect(adapter.rename("session-1", "New title")).rejects.toBe(error);
    expect(update).toHaveBeenCalledWith(
      { sessionID: "session-1", title: "New title" },
      { throwOnError: true },
    );
  });

  it("streams the session's own title without asking OpenCode for one", async () => {
    const get = vi.fn().mockResolvedValue({
      data: { id: "session-1", title: "Fix the login redirect" },
    });
    const summarize = vi.fn();
    const adapter = createOpenCodeThreadListAdapter({
      session: { get, summarize },
    } as never);

    const chunks = await readChunks(await adapter.generateTitle("session-1"));

    expect(get).toHaveBeenCalledWith(
      { sessionID: "session-1" },
      { throwOnError: true },
    );
    expect(summarize).not.toHaveBeenCalled();
    expect(chunks).toContainEqual({
      type: "text-delta",
      path: [0],
      textDelta: "Fix the login redirect",
    });
  });

  it("streams nothing while the session has OpenCode's default title", async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        id: "session-1",
        title: "New session - 2026-10-10T15:00:51.077Z",
      },
    });
    const adapter = createOpenCodeThreadListAdapter({
      session: { get },
    } as never);

    await expect(
      readChunks(await adapter.generateTitle("session-1")),
    ).resolves.toEqual([]);
  });
});
