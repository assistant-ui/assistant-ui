import { describe, expect, it, vi } from "vitest";
import type { transform as transformCodemod } from "../../src/lib/transform";

const mocks = vi.hoisted(() => ({
  getRelevantFiles: vi.fn(() => ["src/app.tsx"]),
  transform: vi.fn<typeof transformCodemod>(async () => []),
  installEdgeLib: vi.fn(),
  installAiSdkLib: vi.fn(),
  loggerSuccess: vi.fn(),
}));

vi.mock("../../src/lib/transform", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/transform")>()),
  getRelevantFiles: mocks.getRelevantFiles,
  transform: mocks.transform,
}));

vi.mock("../../src/lib/install-edge-lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/install-edge-lib")>()),
  default: mocks.installEdgeLib,
}));

vi.mock("../../src/lib/install-ai-sdk-lib", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../src/lib/install-ai-sdk-lib")
  >()),
  default: mocks.installAiSdkLib,
}));

vi.mock("cli-progress", async (importOriginal) => ({
  ...(await importOriginal<typeof import("cli-progress")>()),
  Presets: { shades_classic: {} },
  SingleBar: class {
    start() {}
    update() {}
    stop() {}
  },
}));

vi.mock("../../src/lib/utils/logger", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/utils/logger")>()),
  logger: { info: vi.fn(), success: mocks.loggerSuccess },
}));

vi.mock("debug", async (importOriginal) => ({
  ...(await importOriginal<typeof import("debug")>()),
  default: () => () => {},
}));

import { upgrade } from "../../src/lib/upgrade";

describe("upgrade", () => {
  it("does not run the legacy UI package split", async () => {
    await upgrade({});
    expect(mocks.transform.mock.calls.map(([codemod]) => codemod)).toEqual([
      "v0-9/edge-package-split",
      "v0-11/content-part-to-message-part",
      "v0-12/assistant-api-to-aui",
      "v0-12/event-names-to-camelcase",
      "v0-12/primitive-if-to-aui-if",
      "v0-15/aui-accessor-calls-to-properties",
    ]);
    expect(mocks.installEdgeLib).toHaveBeenCalledOnce();
    expect(mocks.installAiSdkLib).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "stops at a failed codemod without installing dependencies (dry: %s)",
    async (dry) => {
      const failure = new Error("Process exited with code 7");
      mocks.transform.mockImplementationOnce(() => {
        throw failure;
      });
      await expect(upgrade({ dry })).rejects.toBe(failure);
      expect(mocks.transform).toHaveBeenCalledOnce();
      expect(mocks.installEdgeLib).not.toHaveBeenCalled();
      expect(mocks.installAiSdkLib).not.toHaveBeenCalled();
      expect(mocks.loggerSuccess).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    "does not install dependencies during a dry run (print: %s)",
    async (print) => {
      await upgrade({ dry: true, print });
      expect(mocks.transform).toHaveBeenCalledTimes(6);
      for (const call of mocks.transform.mock.calls) {
        expect(call[2]).toEqual({ dry: true, print });
      }
      expect(mocks.installEdgeLib).not.toHaveBeenCalled();
      expect(mocks.installAiSdkLib).not.toHaveBeenCalled();
      expect(mocks.loggerSuccess).toHaveBeenCalledWith(
        "Dry run complete. No files were changed.",
      );
    },
  );
});
