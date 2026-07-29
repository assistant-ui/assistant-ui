import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upgrade: vi.fn(),
}));

vi.mock("../../src/lib/upgrade", () => ({
  upgrade: mocks.upgrade,
}));

vi.mock("debug", () => ({
  default: Object.assign(() => vi.fn(), { enable: vi.fn() }),
}));

import { upgradeCommand } from "../../src/commands/upgrade";

describe("upgrade command", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it("handles asynchronous upgrade failures", async () => {
    mocks.upgrade.mockRejectedValue(new Error("upgrade failed"));

    await expect(
      upgradeCommand.parseAsync(["node", "upgrade"], { from: "node" }),
    ).rejects.toThrow("process.exit");

    expect(mocks.upgrade).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
