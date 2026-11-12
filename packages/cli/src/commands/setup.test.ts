import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  markSetupSession,
  setupSessionMarkerPath,
  shouldGateAgent,
} from "../lib/agent-gate";
import { agentOptions, gateNote, handOffPrompt, setup } from "./setup";

vi.mock("../lib/setup-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/setup-session")>()),
  resolveProducts: vi.fn(async (slugs: string[]) =>
    slugs.map((slug) => ({ slug, name: slug })),
  ),
}));

// Stands in for the session and stream: reports the session, prints the briefing, streams nothing.
vi.mock("setup-agent/sdk", () => ({
  runAgentSetup: vi.fn(async (options) => {
    const session = {
      linkId: "abc",
      setupId: "def",
      agentUrl: "https://setup.test/abc",
      browserUrl: "https://setup.test/#link=abc&setup=def",
      products: options.products,
    };
    options.onSession?.(session);
    options.write?.(`briefing for ${session.browserUrl}\n`);
    return {
      session,
      stream: { stop: vi.fn(async () => {}) },
      client: { dispose: vi.fn() },
    };
  }),
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

  it("takes a setup command after the url and passes its flags through", () => {
    expect(setup.registeredArguments.map((arg) => arg.name())).toEqual([
      "url-and-command",
    ]);
    const { operands, unknown } = setup.parseOptions([
      "https://x.test/a",
      "ask",
      "Pick",
      "--choices",
      "a,b",
      "--wait",
    ]);
    // Commander hands the action operands then unknown options, in order.
    expect([...operands, ...unknown]).toEqual([
      "https://x.test/a",
      "ask",
      "Pick",
      "--choices",
      "a,b",
      "--wait",
    ]);
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

  it("run by an agent, opens a setup session for its folder that lets its install steps past the agent gate, and ends it on exit", async () => {
    const env = { ...process.env };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aui-setup-"));
    vi.spyOn(os, "tmpdir").mockReturnValue(tmp);
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const exitListeners = process.listeners("exit");
    const signals = ["SIGHUP", "SIGINT", "SIGTERM"] as const;
    const signalListeners = signals.map((signal) => process.listeners(signal));
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      // stop() exits once the stream stops.
    }) as typeof process.exit);
    process.env = { PATH: env.PATH, CLAUDECODE: "1" };
    try {
      expect(shouldGateAgent()).toBe(true);
      await setup.parseAsync(["--no-open"], { from: "user" });
      const printed = String(write.mock.calls[0]?.[0]);
      expect(printed).toContain("https://setup.test/#link=abc&setup=def");
      expect(printed).toContain(gateNote(true));
      // `init`, `create` and `add` run in the agent's later shells, which share the temp directory.
      const marker = setupSessionMarkerPath(process.cwd(), tmp);
      expect(fs.existsSync(marker)).toBe(true);
      expect(shouldGateAgent()).toBe(false);
      // Setup removes its marker when it is stopped.
      process.emit("SIGTERM", "SIGTERM");
      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
      expect(fs.existsSync(marker)).toBe(false);
      expect(shouldGateAgent()).toBe(true);
      // And on any other exit.
      markSetupSession({ setupId: "def" });
      const added = process
        .listeners("exit")
        .filter((listener) => !exitListeners.includes(listener));
      expect(added).toHaveLength(1);
      added[0]!(0);
      expect(fs.existsSync(marker)).toBe(false);
    } finally {
      for (const listener of process.listeners("exit"))
        if (!exitListeners.includes(listener))
          process.off("exit", listener as () => void);
      signals.forEach((signal, i) => {
        for (const listener of process.listeners(signal))
          if (!signalListeners[i]!.includes(listener))
            process.off(signal, listener as () => void);
      });
      process.env = env;
      vi.restoreAllMocks();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("tells the agent to pass --force when it cannot record the session", async () => {
    const env = { ...process.env };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aui-setup-"));
    // A temp directory that does not exist, so the marker cannot be written.
    vi.spyOn(os, "tmpdir").mockReturnValue(path.join(tmp, "missing"));
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const exitListeners = process.listeners("exit");
    const signals = ["SIGHUP", "SIGINT", "SIGTERM"] as const;
    const signalListeners = signals.map((signal) => process.listeners(signal));
    process.env = { PATH: env.PATH, CLAUDECODE: "1" };
    try {
      await setup.parseAsync(["--no-open"], { from: "user" });
      const printed = String(write.mock.calls[0]?.[0]);
      expect(printed).toContain(gateNote(false));
      expect(printed).toContain("Add --force");
      expect(
        process
          .listeners("exit")
          .filter((listener) => !exitListeners.includes(listener)),
      ).toHaveLength(0);
    } finally {
      for (const listener of process.listeners("exit"))
        if (!exitListeners.includes(listener))
          process.off("exit", listener as () => void);
      signals.forEach((signal, i) => {
        for (const listener of process.listeners(signal))
          if (!signalListeners[i]!.includes(listener))
            process.off(signal, listener as () => void);
      });
      process.env = env;
      vi.restoreAllMocks();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
