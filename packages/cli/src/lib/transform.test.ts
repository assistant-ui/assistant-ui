import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  spawnSync: vi.fn(),
}));

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  execFileSync: mocks.execFileSync,
  spawnSync: mocks.spawnSync,
}));

import { SpawnExitError } from "./run-spawn";
import { transform } from "./transform";

describe("transform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports progress after a successful codemod", () => {
    mocks.spawnSync.mockReturnValue({
      error: undefined,
      status: 0,
      stdout: "Processing file one\nProcessing file two\n",
      stderr: "",
    });
    const onProgress = vi.fn();

    const errors = transform(
      "v0-8/ui-package-split",
      "/tmp/project",
      { dry: true },
      {
        logStatus: false,
        onProgress,
        relevantFiles: ["/tmp/project/app.tsx"],
      },
    );

    expect(errors).toEqual([]);
    expect(onProgress).toHaveBeenCalledWith(2);
  });

  it("rejects a progress-enabled codemod that exits nonzero", () => {
    mocks.spawnSync.mockReturnValue({
      error: undefined,
      status: 1,
      stdout: "Processing file app.tsx\nTransformation error\n",
      stderr: "SyntaxError: Unexpected token\n",
    });
    const onProgress = vi.fn();

    expect(() =>
      transform(
        "v0-8/ui-package-split",
        "/tmp/project",
        { dry: true },
        {
          logStatus: false,
          onProgress,
          relevantFiles: ["/tmp/project/app.tsx"],
        },
      ),
    ).toThrowError(
      new SpawnExitError(
        1,
        "SyntaxError: Unexpected token\nProcessing file app.tsx\nTransformation error",
      ),
    );
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("includes captured diagnostics for the non-progress path", () => {
    mocks.execFileSync.mockImplementation(() => {
      throw Object.assign(new Error("Command failed"), {
        status: 1,
        stdout: "jscodeshift output",
        stderr: "jscodeshift failure",
      });
    });

    expect(() =>
      transform(
        "v0-8/ui-package-split",
        "/tmp/project",
        {
          dry: true,
        },
        { logStatus: false, relevantFiles: ["/tmp/project/app.tsx"] },
      ),
    ).toThrowError(
      new SpawnExitError(
        1,
        "jscodeshift failure\njscodeshift output\nCommand failed",
      ),
    );
  });
});
