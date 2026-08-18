import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
}));

vi.mock("cross-spawn", () => ({
  default: { sync: mocks.sync },
}));

import { launch } from "./launch";

describe("launch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("propagates child process termination signals", () => {
    mocks.sync.mockReturnValue({
      pid: 123,
      output: [],
      stdout: null,
      stderr: null,
      status: null,
      signal: "SIGTERM",
    });
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);

    launch({ pluginDir: "/tmp/plugin", prompt: "test" });

    expect(kill).toHaveBeenCalledWith(process.pid, "SIGTERM");
  });
});
