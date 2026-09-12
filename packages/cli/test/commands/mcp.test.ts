import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mcp } from "../../src/commands/mcp";
import { SpawnExitError } from "../../src/lib/run-spawn";

const mocks = vi.hoisted(() => ({
  runSpawn: vi.fn<(command: string, args: string[]) => Promise<void>>(),
}));

vi.mock("../../src/lib/run-spawn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/run-spawn")>()),
  runSpawn: mocks.runSpawn,
}));

const HOSTED_MCP_URL = "https://www.assistant-ui.com/mcp";

describe("mcp command", () => {
  let cwd: string;
  let tempDir: string;
  let platformDescriptor: PropertyDescriptor;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let homedirSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cwd = process.cwd();
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "assistant-ui-mcp-")),
    );
    process.chdir(tempDir);

    platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform")!;
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempDir);
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    Object.defineProperty(process, "platform", platformDescriptor);
    homedirSpy.mockRestore();
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  const setPlatform = (value: NodeJS.Platform) => {
    Object.defineProperty(process, "platform", {
      ...platformDescriptor,
      value,
    });
  };

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

  it("writes the hosted mcp url for cursor", async () => {
    await mcp.parseAsync(["node", "mcp", "--cursor"], { from: "node" });

    const configPath = path.join(tempDir, ".cursor", "mcp.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    expect(config).toEqual({
      mcpServers: {
        "assistant-ui": { url: HOSTED_MCP_URL },
      },
    });
  });

  it("writes the hosted mcp serverUrl for windsurf", async () => {
    await mcp.parseAsync(["node", "mcp", "--windsurf"], { from: "node" });

    const configPath = path.join(
      tempDir,
      ".codeium",
      "windsurf",
      "mcp_config.json",
    );
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    expect(config).toEqual({
      mcpServers: {
        "assistant-ui": { serverUrl: HOSTED_MCP_URL },
      },
    });
  });

  it("writes the hosted mcp url as an http server for vscode", async () => {
    await mcp.parseAsync(["node", "mcp", "--vscode"], { from: "node" });

    const configPath = path.join(tempDir, ".vscode", "mcp.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    expect(config).toEqual({
      servers: {
        "assistant-ui": { type: "http", url: HOSTED_MCP_URL },
      },
    });
  });

  it.each(["\n", "\r\n"])(
    "preserves VS Code comments and other settings with %j line endings",
    async (eol) => {
      const configPath = path.join(tempDir, ".vscode", "mcp.json");
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      const content = [
        "{",
        "  // Keep these server notes",
        '  "servers": {',
        '    "other": { "type": "http", "url": "https://example.com/mcp" },',
        "  },",
        "  /* Keep input settings too */",
        '  "inputs": [],',
        "}",
        "",
      ].join(eol);
      fs.writeFileSync(configPath, content);

      await mcp.parseAsync(["node", "mcp", "--vscode"], { from: "node" });

      const updated = fs.readFileSync(configPath, "utf-8");
      expect(updated).toContain("// Keep these server notes");
      expect(updated).toContain("/* Keep input settings too */");
      expect(updated.split(eol).join("")).not.toMatch(/[\r\n]/);
      expect(parseJsonc(updated, [], { allowTrailingComma: true })).toEqual({
        servers: {
          other: { type: "http", url: "https://example.com/mcp" },
          "assistant-ui": { type: "http", url: HOSTED_MCP_URL },
        },
        inputs: [],
      });

      await mcp.parseAsync(["node", "mcp", "--vscode"], { from: "node" });
      expect(fs.readFileSync(configPath, "utf-8")).toBe(updated);
    },
  );

  it("replaces the VS Code assistant-ui entry without rewriting unrelated settings", async () => {
    const configPath = path.join(tempDir, ".vscode", "mcp.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      `{
  "servers": {
    "assistant-ui": { "command": "npx", "args": ["old-server"] },
    // Keep this custom server
    "other": { "command": "custom", "args": [] }
  },
  "inputs": [ ]
}\n`,
    );

    await mcp.parseAsync(["node", "mcp", "--vscode"], { from: "node" });

    const updated = fs.readFileSync(configPath, "utf-8");
    expect(updated).toContain(
      '// Keep this custom server\n    "other": { "command": "custom", "args": [] }',
    );
    expect(updated).toContain('"inputs": [ ]');
    expect(parseJsonc(updated).servers["assistant-ui"]).toEqual({
      type: "http",
      url: HOSTED_MCP_URL,
    });
  });

  it.each([
    "",
    "  \n",
    "// Server configuration\n",
    '{"inputs": [], /* no servers yet */}',
  ])("initializes VS Code server settings from %j", async (content) => {
    const configPath = path.join(tempDir, ".vscode", "mcp.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, content);

    await mcp.parseAsync(["node", "mcp", "--vscode"], { from: "node" });

    const updated = fs.readFileSync(configPath, "utf-8");
    expect(
      parseJsonc(updated, [], { allowTrailingComma: true }).servers,
    ).toEqual({
      "assistant-ui": { type: "http", url: HOSTED_MCP_URL },
    });
    if (content.includes("//"))
      expect(updated).toContain("// Server configuration");
    if (content.includes("/*"))
      expect(updated).toContain("/* no servers yet */");
  });

  it.each([
    '"servers": null',
    '"servers": { "assistant-ui": { "command": "first" }, "assistant-ui": { "command": "last" } }',
    '"servers": { "assistant-ui": { "command": "shadowed" } }, "servers": { "other": { "command": "custom" } }',
    '"servers": { "assistant-ui": { "command": "shadowed" } }, "servers": null',
    '"servers": {}, "servers": { "assistant-ui": { "command": "last" } }',
  ])(
    "updates the effective VS Code server configuration in %s",
    async (servers) => {
      const configPath = path.join(tempDir, ".vscode", "mcp.json");
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        `{\r\n  ${servers},\r\n  // Keep inputs\r\n  "inputs": [ ]\r\n}\r\n`,
      );

      await mcp.parseAsync(["node", "mcp", "--vscode"], { from: "node" });

      const updated = fs.readFileSync(configPath, "utf-8");
      const config = parseJsonc(updated);
      expect(config.servers["assistant-ui"]).toEqual({
        type: "http",
        url: HOSTED_MCP_URL,
      });
      if (servers.includes('"other"')) {
        expect(config.servers.other).toEqual({ command: "custom" });
      }
      if (servers.includes('"shadowed"')) {
        expect(updated).toContain(
          '"servers": { "assistant-ui": { "command": "shadowed" } }',
        );
      }
      expect(updated).toContain('// Keep inputs\r\n  "inputs": [ ]');
      expect(updated.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);

      await mcp.parseAsync(["node", "mcp", "--vscode"], { from: "node" });
      expect(fs.readFileSync(configPath, "utf-8")).toBe(updated);
    },
  );

  it.each([
    '{"servers": {',
    '{"servers": {},,}',
    "{/* unfinished",
    "null",
    "[]",
    '"settings"',
  ])("does not overwrite invalid VS Code configuration %j", async (content) => {
    const configPath = path.join(tempDir, ".vscode", "mcp.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, content);

    await expect(
      mcp.parseAsync(["node", "mcp", "--vscode"], { from: "node" }),
    ).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(fs.readFileSync(configPath, "utf-8")).toBe(content);
  });

  it("keeps strict JSON parsing for other targets", async () => {
    const configPath = path.join(tempDir, ".cursor", "mcp.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    const content = '{\n// A comment\n"mcpServers": {}\n}';
    fs.writeFileSync(configPath, content);

    await expect(
      mcp.parseAsync(["node", "mcp", "--cursor"], { from: "node" }),
    ).rejects.toThrow("process.exit");

    expect(fs.readFileSync(configPath, "utf-8")).toBe(content);
  });

  it("replaces an existing stdio assistant-ui entry wholesale for an http client", async () => {
    const configPath = path.join(tempDir, ".cursor", "mcp.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          "assistant-ui": {
            command: "npx",
            args: ["-y", "@assistant-ui/mcp-docs-server"],
          },
          "other-server": { command: "foo" },
        },
      }),
      "utf-8",
    );

    await mcp.parseAsync(["node", "mcp", "--cursor"], { from: "node" });

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    expect(config).toEqual({
      mcpServers: {
        "assistant-ui": { url: HOSTED_MCP_URL },
        "other-server": { command: "foo" },
      },
    });
  });

  it("keeps the stdio npx config for zed", async () => {
    setPlatform("darwin");

    await mcp.parseAsync(["node", "mcp", "--zed"], { from: "node" });

    const configPath = path.join(tempDir, ".zed", "settings.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    expect(config).toEqual({
      context_servers: {
        "assistant-ui": {
          command: {
            path: "npx",
            args: ["-y", "@assistant-ui/mcp-docs-server"],
          },
        },
      },
    });
  });

  it("keeps the stdio npx config for claude-desktop", async () => {
    setPlatform("darwin");

    await mcp.parseAsync(["node", "mcp", "--claude-desktop"], {
      from: "node",
    });

    const configPath = path.join(
      tempDir,
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json",
    );
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    expect(config).toEqual({
      mcpServers: {
        "assistant-ui": {
          command: "npx",
          args: ["-y", "@assistant-ui/mcp-docs-server"],
        },
      },
    });
  });

  it("re-registers claude-code by removing the previous entry before adding", async () => {
    mocks.runSpawn
      .mockRejectedValueOnce(new SpawnExitError(1, "No MCP server found"))
      .mockResolvedValueOnce(undefined);

    await mcp.parseAsync(["node", "mcp", "--claude-code"], {
      from: "node",
    });

    expect(mocks.runSpawn.mock.calls).toEqual([
      ["claude", ["mcp", "remove", "assistant-ui"]],
      [
        "claude",
        ["mcp", "add", "--transport", "http", "assistant-ui", HOSTED_MCP_URL],
      ],
    ]);
  });
});
