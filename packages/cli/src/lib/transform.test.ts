import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSpawnCapture: vi.fn(),
}));

vi.mock("./run-spawn", async (importOriginal) => ({
  ...(await importOriginal()),
  runSpawnCapture: mocks.runSpawnCapture,
}));

import { transform } from "./transform";
import { SpawnExitError } from "./run-spawn";

describe("transform", () => {
  it("runs codemods asynchronously and reports progress", async () => {
    mocks.runSpawnCapture.mockResolvedValue({
      code: 0,
      signal: null,
      stdout: "Processing file one\nProcessing file two\n",
      stderr: "",
    });
    const onProgress = vi.fn();

    const errors = await transform(
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
    expect(mocks.runSpawnCapture).toHaveBeenCalledWith(
      "npx",
      expect.arrayContaining(["jscodeshift", "--dry"]),
    );
  });

  it("fails a progress-enabled codemod that exits nonzero", async () => {
    mocks.runSpawnCapture.mockResolvedValue({
      code: 7,
      signal: null,
      stdout: "Processing file app.tsx\n",
      stderr: "SyntaxError: Broken input\n",
    });
    const onProgress = vi.fn();

    const failure = transform(
      "v0-8/ui-package-split",
      "/tmp/project",
      { dry: true },
      {
        logStatus: false,
        onProgress,
        relevantFiles: ["/tmp/project/app.tsx"],
      },
    );

    await expect(failure).rejects.toBeInstanceOf(SpawnExitError);
    await expect(failure).rejects.toThrow("SyntaxError: Broken input");
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("surfaces the codemod's stderr when it exits nonzero", async () => {
    mocks.runSpawnCapture.mockResolvedValue({
      code: 1,
      signal: null,
      stdout: "",
      stderr: "SyntaxError: Unexpected token\n",
    });

    const failure = transform(
      "v0-8/ui-package-split",
      "/tmp/project",
      { dry: true },
      { logStatus: false, relevantFiles: ["/tmp/project/app.tsx"] },
    );

    await expect(failure).rejects.toBeInstanceOf(SpawnExitError);
    await expect(failure).rejects.toThrow("SyntaxError: Unexpected token");
  });
});
