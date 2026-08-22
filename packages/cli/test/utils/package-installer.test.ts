import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { installPackageIfNeeded } from "../../src/lib/utils/package-installer";
import * as packageManager from "../../src/lib/utils/package-manager";
import * as fileScanner from "../../src/lib/utils/file-scanner";

vi.mock("../../src/lib/utils/package-manager");
vi.mock("../../src/lib/utils/file-scanner");

describe("package-installer utilities", () => {
  let testDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("installPackageIfNeeded", () => {
    it("should skip installation when import patterns not found", async () => {
      vi.mocked(fileScanner.scanForImport).mockReturnValue(false);

      await installPackageIfNeeded({
        packageName: "@assistant-ui/react",
        importPatterns: ["@assistant-ui/react"],
        promptMessage: "Install?",
        skipMessage: "Already installed",
        notFoundMessage: "Not found",
      });

      expect(consoleLogSpy).toHaveBeenCalledWith("Not found");
      expect(packageManager.isPackageInstalled).not.toHaveBeenCalled();
    });

    it("should skip installation when package already installed", async () => {
      vi.mocked(fileScanner.scanForImport).mockReturnValue(true);
      vi.mocked(packageManager.isPackageInstalled).mockReturnValue(true);

      await installPackageIfNeeded({
        packageName: "@assistant-ui/react",
        importPatterns: ["@assistant-ui/react"],
        promptMessage: "Install?",
        skipMessage: "Already installed",
        notFoundMessage: "Not found",
      });

      expect(consoleLogSpy).toHaveBeenCalledWith("Already installed");
      expect(packageManager.installPackage).not.toHaveBeenCalled();
    });

    it("should prompt for installation when package needed but not installed", async () => {
      vi.mocked(fileScanner.scanForImport).mockReturnValue(true);
      vi.mocked(packageManager.isPackageInstalled).mockReturnValue(false);
      vi.mocked(packageManager.askQuestion).mockResolvedValue("y");
      vi.mocked(packageManager.installPackage).mockResolvedValue(true);

      await installPackageIfNeeded({
        packageName: "@assistant-ui/react",
        importPatterns: ["@assistant-ui/react"],
        promptMessage: "Install @assistant-ui/react? (Y/n) ",
        skipMessage: "Already installed",
        notFoundMessage: "Not found",
      });

      expect(packageManager.askQuestion).toHaveBeenCalledWith(
        "Install @assistant-ui/react? (Y/n) ",
      );
      expect(packageManager.installPackage).toHaveBeenCalledWith(
        "@assistant-ui/react",
      );
    });

    it("should skip installation when user declines", async () => {
      vi.mocked(fileScanner.scanForImport).mockReturnValue(true);
      vi.mocked(packageManager.isPackageInstalled).mockReturnValue(false);
      vi.mocked(packageManager.askQuestion).mockResolvedValue("n");

      await installPackageIfNeeded({
        packageName: "@assistant-ui/react",
        importPatterns: ["@assistant-ui/react"],
        promptMessage: "Install?",
        skipMessage: "Already installed",
        notFoundMessage: "Not found",
      });

      expect(packageManager.installPackage).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping installation.");
    });

    it("should install when user provides empty input (default yes)", async () => {
      vi.mocked(fileScanner.scanForImport).mockReturnValue(true);
      vi.mocked(packageManager.isPackageInstalled).mockReturnValue(false);
      vi.mocked(packageManager.askQuestion).mockResolvedValue("");
      vi.mocked(packageManager.installPackage).mockResolvedValue(true);

      await installPackageIfNeeded({
        packageName: "@assistant-ui/react",
        importPatterns: ["@assistant-ui/react"],
        promptMessage: "Install?",
        skipMessage: "Already installed",
        notFoundMessage: "Not found",
      });

      expect(packageManager.installPackage).toHaveBeenCalledWith(
        "@assistant-ui/react",
      );
    });
  });
});
