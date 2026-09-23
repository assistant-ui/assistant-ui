import { describe, expect, it, onTestFinished, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

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
  it.each(["parse", "transform"])(
    "rejects real jscodeshift %s failures",
    async (kind) => {
      const directory = mkdtempSync(join(tmpdir(), "aui-transform-errors-"));
      onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
      const file = join(directory, "app.tsx");
      const source =
        kind === "parse"
          ? 'import "@assistant-ui/react"; const broken = ;'
          : 'import "@assistant-ui/react"; const value = 1;';
      writeFileSync(file, source);
      const codemod = join(directory, "transform.cjs");
      writeFileSync(
        codemod,
        kind === "parse"
          ? "module.exports = (file, api) => api.jscodeshift(file.source).toSource();"
          : 'module.exports = () => { throw new Error("fixture transform failure"); };',
      );
      const actual =
        await vi.importActual<typeof import("./run-spawn")>("./run-spawn");
      const require = createRequire(import.meta.url);
      mocks.runSpawnCapture.mockImplementationOnce(
        (_command: string, args: string[]) => {
          const runnerArgs = args.slice(1);
          runnerArgs[runnerArgs.indexOf("-t") + 1] = codemod;
          return actual.runSpawnCapture(process.execPath, [
            require.resolve("jscodeshift/bin/jscodeshift.js"),
            ...runnerArgs,
            "--run-in-band",
          ]);
        },
      );

      const failure = transform(
        "v0-12/assistant-api-to-aui",
        directory,
        {},
        {
          logStatus: false,
          relevantFiles: [file],
        },
      );
      await expect(failure).rejects.toBeInstanceOf(SpawnExitError);
      await expect(failure).rejects.toThrow(
        kind === "parse" ? "Transformation error" : "fixture transform failure",
      );
      await expect(failure).rejects.toMatchObject({
        stderr: "",
        stdout: expect.stringContaining("Transformation error"),
      });
      expect(readFileSync(file, "utf8")).toBe(source);
    },
    15_000,
  );

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
    await expect(failure).rejects.toMatchObject({
      stdout: "Processing file app.tsx\n",
      stderr: "SyntaxError: Broken input\n",
    });
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
