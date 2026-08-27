import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSpawnCapture: vi.fn(),
}));

vi.mock("./run-spawn", async (importOriginal) => ({
  ...(await importOriginal()),
  runSpawnCapture: mocks.runSpawnCapture,
}));

import { transform } from "./transform";

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
});
