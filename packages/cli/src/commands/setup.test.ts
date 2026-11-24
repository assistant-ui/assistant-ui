import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runAgentSetup } from "setup-agent/sdk";
import {
  clearSetupSession,
  isSetupSessionActive,
  markSetupSession,
  setupSessionMarkerPath,
  shouldGateAgent,
} from "../lib/agent-gate";
import {
  agentHeader,
  agentOptions,
  gateNote,
  handOffPrompt,
  projectProviders,
  setup,
} from "./setup";

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

  it("names both ways to go and a clean stop", () => {
    const header = agentHeader({
      pid: 42,
      agentUrl: "https://c.test/abc",
      pageUrl: "https://setup.test/#link=abc",
      noBrowser: "ssh",
      unattended: false,
      providers: [],
    });
    expect(header).toContain(
      "give them https://setup.test/#link=abc to open on any device (setup opens no browser here: ssh)",
    );
    expect(header).toContain(
      "run `npx assistant-ui@latest setup --unattended`",
    );
    expect(header).toContain(
      "`npx assistant-ui@latest setup https://c.test/abc cancel`, then `kill 42`",
    );
  });

  describe("model provider", () => {
    const header = (providers: string[], unattended = false) =>
      agentHeader({
        pid: 42,
        agentUrl: "https://c.test/abc",
        pageUrl: "https://setup.test/#link=abc",
        noBrowser: undefined,
        unattended,
        providers,
      });
    const project = (files: Record<string, string>) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aui-provider-"));
      for (const [name, text] of Object.entries(files))
        fs.writeFileSync(path.join(dir, name), text);
      return dir;
    };

    it("keeps OpenAI in a project already on OpenAI", () => {
      const dir = project({
        "package.json": JSON.stringify({
          dependencies: { ai: "^7.0.0", "@ai-sdk/openai": "^4.0.0" },
        }),
      });
      try {
        const providers = projectProviders(dir);
        expect(providers).toEqual(["openai"]);
        const text = header(providers);
        expect(text).toContain(
          "Model provider: this project already uses openai. Keep it: do not switch providers",
        );
        expect(text).toContain("pass --default openai");
        expect(text).not.toContain("anthropic");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("finds the provider from its key in an env file", () => {
      const dir = project({
        "package.json": "{}",
        ".env.local":
          "# keys\nexport ANTHROPIC_API_KEY='sk-test'\nGROQ_API_KEY=\n",
      });
      try {
        expect(projectProviders(dir)).toEqual(["anthropic"]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("gives a project with no provider the default", () => {
      const dir = project({
        "package.json": JSON.stringify({ dependencies: { react: "^19.0.0" } }),
      });
      try {
        const providers = projectProviders(dir);
        expect(providers).toEqual([]);
        expect(header(providers)).toContain(
          "Model provider: none found in this folder's package.json or env files. Keep the one the app you install into uses, if any; otherwise the default is openai, which the llm-provider question offers first.",
        );
        expect(header(providers, true)).toContain(
          'otherwise the default is openai: use it and list it under "To finish".',
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("keeps every provider a project uses when it has several", () => {
      const dir = project({
        "package.json": JSON.stringify({
          dependencies: { "@ai-sdk/openai": "^4.0.0" },
          optionalDependencies: { "@openrouter/ai-sdk-provider": "^2.0.0" },
        }),
        ".env.production.local": "ANTHROPIC_API_KEY=sk-test\n",
      });
      let providers: string[];
      try {
        providers = projectProviders(dir);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      expect(providers).toEqual(["openai", "anthropic", "openrouter"]);
      expect(header(["openai", "anthropic"])).toContain(
        "this project already uses openai and anthropic. Keep them: do not switch providers or uninstall a provider package unless the user picks another, and pass the one its chat route uses as --default",
      );
    });
  });

  it("offers products and a no-open flag", () => {
    expect(setup.options.map((option) => option.long)).toEqual([
      "--products",
      "--no-open",
      "--unattended",
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
      expect(printed).toMatch(/^This is the assistant-ui CLI/);
      expect(printed).toContain(`kill ${process.pid}`);
      expect(gateNote(true)).not.toContain("--force");
      // `init`, `create` and `add` run in the agent's later shells, which share the temp directory.
      const marker = setupSessionMarkerPath(process.cwd(), "def", tmp);
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

  it("ends the session when a signal arrives while setup is still starting", async () => {
    const env = { ...process.env };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aui-setup-"));
    vi.spyOn(os, "tmpdir").mockReturnValue(tmp);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitListeners = process.listeners("exit");
    const signals = ["SIGHUP", "SIGINT", "SIGTERM"] as const;
    const signalListeners = signals.map((signal) => process.listeners(signal));
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      // Startup keeps waiting; the test only checks the marker and the exit.
    }) as typeof process.exit);
    let finishStartup!: () => void;
    let sessionStarted!: () => void;
    const started = new Promise<void>((resolve) => (sessionStarted = resolve));
    vi.mocked(runAgentSetup).mockImplementationOnce(async (options) => {
      const session = {
        linkId: "abc",
        setupId: "def",
        agentUrl: "https://setup.test/abc",
        browserUrl: "https://setup.test/#link=abc&setup=def",
        products: options.products,
      };
      options.onSession?.(session);
      sessionStarted();
      // Like followSetup waiting for agent/hello.
      await new Promise<void>((resolve) => (finishStartup = resolve));
      return {
        session,
        stream: { stop: vi.fn(async () => {}) },
        client: { dispose: vi.fn() },
      } as unknown as Awaited<ReturnType<typeof runAgentSetup>>;
    });
    process.env = { PATH: env.PATH, CLAUDECODE: "1" };
    try {
      const running = setup.parseAsync(["--no-open"], { from: "user" });
      await started;
      const marker = setupSessionMarkerPath(process.cwd(), "def", tmp);
      expect(fs.existsSync(marker)).toBe(true);
      process.emit("SIGINT", "SIGINT");
      expect(exit).toHaveBeenCalledWith(0);
      expect(fs.existsSync(marker)).toBe(false);
      finishStartup();
      await running;
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

  it("keeps the session while another setup in the same project still runs", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aui-setup-"));
    try {
      const older = markSetupSession({ setupId: "old" }, tmp)!;
      const newer = markSetupSession({ setupId: "new" }, tmp)!;
      clearSetupSession(older);
      expect(fs.existsSync(newer)).toBe(true);
      expect(isSetupSessionActive({ dir: tmp })).toBe(true);
      clearSetupSession(newer);
      expect(isSetupSessionActive({ dir: tmp })).toBe(false);
    } finally {
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
