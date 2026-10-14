import { describe, expect, it, vi } from "vitest";
import { installPackageIfNeeded } from "./package-installer";

const mocks = vi.hoisted(() => ({
  askQuestion: vi.fn(),
  installPackage: vi.fn(),
}));

vi.mock("./file-scanner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./file-scanner")>()),
  scanForImport: () => true,
}));

vi.mock("./package-manager", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./package-manager")>()),
  isPackageInstalled: () => false,
  askQuestion: mocks.askQuestion,
  installPackage: mocks.installPackage,
}));

describe("installPackageIfNeeded", () => {
  it.each(["y", ""])(
    "rejects a failed required install after accepting with %j",
    async (answer) => {
      mocks.askQuestion.mockResolvedValue(answer);
      mocks.installPackage.mockResolvedValue(false);

      await expect(
        installPackageIfNeeded({
          packageName: "@assistant-ui/ai-sdk",
          importPatterns: ["@assistant-ui/ai-sdk"],
          promptMessage: "Install?",
          skipMessage: "Already installed",
          notFoundMessage: "Not found",
        }),
      ).rejects.toThrow("Failed to install @assistant-ui/ai-sdk");
    },
  );
});
