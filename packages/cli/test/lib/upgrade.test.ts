import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRelevantFiles: vi.fn(() => ["src/app.tsx"]),
  transform: vi.fn(() => []),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not run the legacy UI package split", async () => {
    await upgrade({ dry: true });

    const codemods = mocks.transform.mock.calls.map(([codemod]) => codemod);
    expect(codemods).toEqual([
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

  it("stops at a failed codemod without installing dependencies", async () => {
    const failure = new Error("Process exited with code 7");
    mocks.transform.mockImplementationOnce(() => {
      throw failure;
    });

    await expect(upgrade({ dry: true })).rejects.toBe(failure);

    expect(mocks.transform).toHaveBeenCalledOnce();
    expect(mocks.installEdgeLib).not.toHaveBeenCalled();
    expect(mocks.installAiSdkLib).not.toHaveBeenCalled();
    expect(mocks.loggerSuccess).not.toHaveBeenCalled();
  });
});
