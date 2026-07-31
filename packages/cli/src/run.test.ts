import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parseAsync: vi.fn(),
}));

vi.mock("./program", () => ({
  buildProgram: () => ({
    parseAsync: mocks.parseAsync,
  }),
}));

import { runCli } from "./run";

describe("runCli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awaits and propagates asynchronous command failures", async () => {
    const error = new Error("command failed");
    mocks.parseAsync.mockRejectedValue(error);

    await expect(runCli()).rejects.toBe(error);
    expect(mocks.parseAsync).toHaveBeenCalledOnce();
  });
});
