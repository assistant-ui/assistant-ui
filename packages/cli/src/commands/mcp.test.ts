import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mcp } from "./mcp";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

const fixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "assistant-ui-mcp-"));
  directories.push(directory);
  vi.spyOn(process, "cwd").mockReturnValue(directory);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit");
  });
  return directory;
};

describe("mcp project configuration", () => {
  it("refuses a symbolic link and preserves its target", async () => {
    const directory = fixture();
    const configDir = path.join(directory, ".cursor");
    fs.mkdirSync(configDir);
    const target = path.join(directory, "target.json");
    const file = path.join(configDir, "mcp.json");
    fs.writeFileSync(target, "{}\n", { mode: 0o644 });
    fs.chmodSync(target, 0o644);
    fs.symlinkSync(target, file);
    await expect(
      mcp.parseAsync(["--cursor"], { from: "user" }),
    ).rejects.toThrow("exit");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`${file} is a symbolic link`),
    );
    expect(fs.readFileSync(target, "utf8")).toBe("{}\n");
    expect(fs.statSync(target).mode & 0o777).toBe(0o644);
  });

  it("refuses a parent directory linked outside the project", async () => {
    const directory = fixture();
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), "assistant-ui-mcp-outside-"),
    );
    directories.push(outside);
    fs.symlinkSync(outside, path.join(directory, ".cursor"), "dir");
    await expect(
      mcp.parseAsync(["--cursor"], { from: "user" }),
    ).rejects.toThrow("exit");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("outside the project"),
    );
    expect(fs.existsSync(path.join(outside, "mcp.json"))).toBe(false);
  });

  it("writes regular and missing project configuration files", async () => {
    const directory = fixture();
    await mcp.parseAsync(["--cursor"], { from: "user" });
    const file = path.join(directory, ".cursor", "mcp.json");
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({
      mcpServers: {
        "assistant-ui": { url: "https://www.assistant-ui.com/mcp" },
      },
    });
    fs.writeFileSync(file, '{"other":true}\n');
    await mcp.parseAsync(["--cursor"], { from: "user" });
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({
      other: true,
      mcpServers: {
        "assistant-ui": { url: "https://www.assistant-ui.com/mcp" },
      },
    });
  });

  it("writes a home configuration through its existing directory link", async () => {
    fixture();
    const home = fs.mkdtempSync(
      path.join(os.tmpdir(), "assistant-ui-mcp-home-"),
    );
    const configDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "assistant-ui-mcp-config-"),
    );
    directories.push(home, configDir);
    vi.spyOn(os, "homedir").mockReturnValue(home);
    fs.symlinkSync(configDir, path.join(home, ".codeium"), "dir");
    fs.mkdirSync(path.join(configDir, "windsurf"));
    await mcp.parseAsync(["--windsurf"], { from: "user" });
    const file = path.join(configDir, "windsurf", "mcp_config.json");
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({
      mcpServers: {
        "assistant-ui": { serverUrl: "https://www.assistant-ui.com/mcp" },
      },
    });
  });

  it("writes a linked home configuration file through its link", async () => {
    fixture();
    const home = fs.mkdtempSync(
      path.join(os.tmpdir(), "assistant-ui-mcp-home-"),
    );
    const dotfiles = fs.mkdtempSync(
      path.join(os.tmpdir(), "assistant-ui-mcp-dotfiles-"),
    );
    directories.push(home, dotfiles);
    vi.spyOn(os, "homedir").mockReturnValue(home);
    const target = path.join(dotfiles, "mcp_config.json");
    fs.writeFileSync(target, '{"other":true}\n');
    fs.mkdirSync(path.join(home, ".codeium", "windsurf"), { recursive: true });
    const file = path.join(home, ".codeium", "windsurf", "mcp_config.json");
    fs.symlinkSync(target, file);
    await mcp.parseAsync(["--windsurf"], { from: "user" });
    expect(fs.lstatSync(file).isSymbolicLink()).toBe(true);
    expect(JSON.parse(fs.readFileSync(target, "utf8"))).toEqual({
      other: true,
      mcpServers: {
        "assistant-ui": { serverUrl: "https://www.assistant-ui.com/mcp" },
      },
    });
  });
});
