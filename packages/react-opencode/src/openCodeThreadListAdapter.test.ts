import { describe, expect, it, vi } from "vitest";
import { createOpenCodeThreadListAdapter } from "./openCodeThreadListAdapter";
import { rejectWhenThrowing } from "./testUtils";

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

  it("does not call session.summarize when generating a title", async () => {
    const summarize = vi.fn();
    const adapter = createOpenCodeThreadListAdapter({
      session: { summarize },
    } as never);

    const stream = (await adapter.generateTitle()) as ReadableStream;

    expect(summarize).not.toHaveBeenCalled();
    expect(await stream.getReader().read()).toEqual({
      done: true,
      value: undefined,
    });
  });

  it("maps native session titles when listing or fetching threads", async () => {
    const session = { id: "session-1", title: "Native title", time: {} };
    const list = vi.fn().mockResolvedValue({ data: [session] });
    const get = vi.fn().mockResolvedValue({ data: session });
    const adapter = createOpenCodeThreadListAdapter({
      experimental: { session: { list } },
      session: { get },
    } as never);

    await expect(adapter.list()).resolves.toMatchObject({
      threads: [{ remoteId: "session-1", title: "Native title" }],
    });
    await expect(adapter.fetch("session-1")).resolves.toMatchObject({
      remoteId: "session-1",
      title: "Native title",
    });
  });
});
