import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { shouldGateAgent } from "../lib/agent-gate";
import { agentOptions, handOffPrompt, setup } from "./setup";

vi.mock("../lib/setup-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/setup-session")>()),
  resolveProducts: vi.fn(async (slugs: string[]) =>
    slugs.map((slug) => ({ slug, name: slug })),
  ),
  startSetup: vi.fn(async ({ products }) => ({
    linkId: "abc",
    setupId: "def",
    agentUrl: "https://setup.test/abc",
    browserUrl: "https://setup.test/#link=abc&setup=def",
    products,
  })),
}));

describe("setup", () => {
  it("lists every agent, marks what it can start, and ends with Other agent", () => {
    const options = agentOptions(undefined, (agent) => agent.kind === "claude");
    expect(options).toHaveLength(21);
    expect(options[0]).toEqual({
      value: "claude",
      label: "Claude Code",
      hint: "starts here",
    });
    expect(options.find((option) => option.value === "codex")?.hint).toBe(
      "not installed",
    );
    expect(options.find((option) => option.value === "zed")?.hint).toBe(
      "copy the prompt",
    );
    expect(options.at(-1)).toEqual({
      value: "other",
      label: "Other agent",
      hint: "copy the prompt",
    });
  });

  it("shows the prompt in a box and copies it on Enter", async () => {
    let out = "";
    const copy = vi.fn(async () => true);
    await handOffPrompt("Set up assistant-ui", undefined, {
      print: (text) => (out += text),
      enter: async () => true,
      copy,
    });
    expect(out).toContain("Paste this prompt into your coding agent:");
    expect(out).toContain("│  Set up assistant-ui  │");
    expect(out).toContain("Press Enter to copy the prompt");
    expect(out).toContain("Copied. Paste it into your coding agent.");
    expect(copy).toHaveBeenCalledWith("Set up assistant-ui");
  });

  it("tells the person to copy by hand when no clipboard works", async () => {
    let out = "";
    await handOffPrompt("p", "Zed", {
      print: (text) => (out += text),
      enter: async () => true,
      copy: async () => false,
    });
    expect(out).toContain("Paste this prompt into Zed:");
    expect(out).toContain("Could not reach the clipboard");
  });

  it("offers products and a no-open flag", () => {
    expect(setup.options.map((option) => option.long)).toEqual([
      "--products",
      "--no-open",
      "--docs-url",
      "--setup-server",
      "--setup-app-url",
    ]);
  });

  it("run by an agent, opens a setup session that lets its install steps past the agent gate", async () => {
    const env = { ...process.env };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aui-setup-"));
    vi.spyOn(os, "tmpdir").mockReturnValue(tmp);
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    process.env = { PATH: env.PATH, CLAUDECODE: "1" };
    try {
      expect(shouldGateAgent()).toBe(true);
      await setup.parseAsync(["--no-open"], { from: "user" });
      expect(String(write.mock.calls[0]?.[0])).toContain(
        "https://setup.test/#link=abc&setup=def",
      );
      // `init`, `create` and `add` run in the agent's later shells, which share the temp directory.
      expect(shouldGateAgent()).toBe(false);
    } finally {
      process.env = env;
      vi.restoreAllMocks();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
