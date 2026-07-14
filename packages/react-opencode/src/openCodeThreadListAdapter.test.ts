import { describe, expect, it, vi } from "vitest";
import { createOpenCodeThreadListAdapter } from "./openCodeThreadListAdapter";

const rejectWhenThrowing = (error: Error) =>
  vi.fn(
    (_parameters: unknown, options?: { throwOnError?: boolean | undefined }) =>
      options?.throwOnError
        ? Promise.reject(error)
        : Promise.resolve({ data: undefined, error }),
  );

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
});
