import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mcp } from "../../src/commands/mcp";

describe("mcp command", () => {
  let cwd: string;
  let tempDir: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cwd = process.cwd();
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "assistant-ui-mcp-")),
    );
    process.chdir(tempDir);

    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("prints recovery details for invalid existing config JSON", async () => {
    const configPath = path.join(tempDir, ".cursor", "mcp.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, "{ invalid json", "utf-8");

    await expect(
      mcp.parseAsync(["node", "mcp", "--cursor"], { from: "node" }),
    ).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);

    const output = [
      ...consoleErrorSpy.mock.calls.flat(),
      ...consoleLogSpy.mock.calls.flat(),
    ].join("\n");

    expect(output).toContain("Could not parse Cursor MCP config.");
    expect(output).toContain(`Config path: ${configPath}`);
    expect(output).toContain(
      "Fix the JSON syntax in that file, then run: assistant-ui mcp --cursor",
    );
    expect(output).toContain("No changes were written.");
    expect(output).not.toContain("SyntaxError");
  });
});
