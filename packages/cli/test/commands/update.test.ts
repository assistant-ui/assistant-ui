import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { update } from "../../src/commands/update";

describe("update command", () => {
  let tempDir: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "assistant-ui-update-")),
    );

    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("prints recovery details for invalid package.json", async () => {
    const packageJsonPath = path.join(tempDir, "package.json");
    fs.writeFileSync(packageJsonPath, "{ invalid json", "utf-8");

    await expect(
      update.parseAsync(["node", "update", "--cwd", tempDir], {
        from: "node",
      }),
    ).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);

    const stderr = consoleErrorSpy.mock.calls.flat().join("\n");
    const stdout = consoleLogSpy.mock.calls.flat().join("\n");

    expect(stderr).toContain("Could not parse package.json.");
    expect(stderr).toContain(`Package path: ${packageJsonPath}`);
    expect(stderr).toContain(
      "Fix the JSON syntax in that file, then run: assistant-ui update",
    );
    expect(stderr).toContain("No changes were written.");
    expect(stderr).not.toContain("SyntaxError");
    expect(stdout).toBe("");
  });
});
