import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_SETUP_HINT,
  AGENT_SETUP_POINTER,
  addAgentSetupHelp,
  isRunByAgent,
} from "./agent-setup-hint";
import { buildProgram } from "../program";

const tty = { isTTY: true };

/** Sets `isTTY` on stdin and stdout until the returned function restores them. */
const setTTY = (value: boolean | undefined) => {
  const descriptors = [process.stdin, process.stdout].map(
    (stream) =>
      [stream, Object.getOwnPropertyDescriptor(stream, "isTTY")] as const,
  );
  for (const [stream] of descriptors)
    Object.defineProperty(stream, "isTTY", { value, configurable: true });
  return () => {
    for (const [stream, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(stream, "isTTY", descriptor);
      else delete (stream as { isTTY?: boolean }).isTTY;
    }
  };
};

describe("isRunByAgent", () => {
  it("is true under an agent or without a terminal", () => {
    expect(isRunByAgent({ CLAUDECODE: "1" }, tty, tty)).toBe(true);
    expect(isRunByAgent({}, { isTTY: undefined }, tty)).toBe(true);
    expect(isRunByAgent({}, tty, tty)).toBe(false);
  });
});

describe("agent setup help", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  const help = (command: Command) => {
    let text = "";
    command.configureOutput({ writeOut: (chunk) => (text += chunk) });
    command.outputHelp();
    return text;
  };

  it("ends the help with the hint for an agent only, so `--help | tail` keeps it", () => {
    const command = addAgentSetupHelp(new Command("init"));
    process.env.CLAUDECODE = "1";
    expect(help(command).endsWith(`${AGENT_SETUP_HINT}\n`)).toBe(true);
    expect(help(command).startsWith(AGENT_SETUP_HINT)).toBe(false);
    // Only PATH survives, so no agent variable from the shell running the tests leaks in.
    process.env = { PATH: env.PATH };
    const restore = setTTY(true);
    try {
      expect(help(command)).not.toContain(AGENT_SETUP_HINT);
    } finally {
      restore();
    }
  });

  it("ends the root help with the hint for an agent", () => {
    process.env.CLAUDECODE = "1";
    const text = help(buildProgram());
    expect(text.trimEnd().endsWith(AGENT_SETUP_HINT)).toBe(true);
    expect(text.split(AGENT_SETUP_HINT)).toHaveLength(2);
    for (const name of ["init", "create"]) {
      const command = buildProgram().commands.find((c) => c.name() === name)!;
      expect(help(command).trimEnd().endsWith(AGENT_SETUP_HINT)).toBe(true);
    }
  });
});

describe("addAgentSetupHint", () => {
  const env = { ...process.env };
  const argv = process.argv;
  let tmp: string;
  let out: string[];
  let restoreTTY: () => void;

  beforeEach(() => {
    // A fresh module, so each test starts before the once-per-process hint.
    vi.resetModules();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aui-hint-"));
    vi.spyOn(os, "tmpdir").mockReturnValue(tmp);
    // Only PATH survives, so no agent variable from the shell running the tests leaks in.
    process.env = { PATH: env.PATH };
    restoreTTY = setTTY(undefined);
    out = [];
    vi.spyOn(process.stdout, "write").mockImplementation(((chunk: unknown) => {
      out.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
  });
  afterEach(() => {
    restoreTTY();
    process.env = { ...env };
    process.argv = argv;
    vi.restoreAllMocks();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  /** Builds a gated `name` command with the hint, as the program does, and runs it typed. */
  const load = async () => {
    const { addAgentSetupHint } = await import("./agent-setup-hint");
    const { addAgentGate, markSetupSession } = await import("./agent-gate");
    const action = vi.fn(() => {
      process.stdout.write("Next steps: npm run dev\n");
    });
    const build = (name: string) =>
      addAgentSetupHint(
        addAgentGate(new Command(name).argument("[dir]").action(action), {
          projectArgument: true,
        }),
      );
    const run = async (name: string, args: string[], command = build(name)) => {
      process.argv = ["node", "assistant-ui", name, ...args];
      await command.parseAsync(args, { from: "user" });
      return command;
    };
    return { action, build, run, markSetupSession };
  };

  const hints = () => out.filter((chunk) => chunk.includes("setup"));

  it("prints the hint before an undetected agent's run starts and a pointer after it, once", async () => {
    const { action, run } = await load();
    const exitListeners = process.listenerCount("exit");
    const command = await run("create", ["my-app"]);
    await run("create", ["my-app"], command);
    expect(process.listenerCount("exit")).toBe(exitListeners);
    expect(action).toHaveBeenCalledTimes(2);
    expect(out).toEqual([
      `${AGENT_SETUP_HINT}\n\n`,
      "Next steps: npm run dev\n",
      `\n${AGENT_SETUP_POINTER}\n`,
      "Next steps: npm run dev\n",
    ]);
  });

  it("prints the pointer on exit when the command stops before it finishes", async () => {
    const { addAgentSetupHint } = await import("./agent-setup-hint");
    const exitListeners = process.listeners("exit");
    const command = addAgentSetupHint(
      new Command("create").action(() => {
        throw new Error("Unknown template");
      }),
    );
    process.argv = ["node", "assistant-ui", "create"];
    await expect(command.parseAsync([], { from: "user" })).rejects.toThrow(
      "Unknown template",
    );
    const added = process
      .listeners("exit")
      .filter((listener) => !exitListeners.includes(listener));
    expect(added).toHaveLength(1);
    process.removeListener("exit", added[0]!);
    added[0]!(0);
    expect(out).toEqual([
      `${AGENT_SETUP_HINT}\n\n`,
      `\n${AGENT_SETUP_POINTER}\n`,
    ]);
  });

  it("leaves the hint out at a terminal", async () => {
    restoreTTY();
    restoreTTY = setTTY(true);
    const { action, run } = await load();
    await run("create", ["my-app"]);
    expect(action).toHaveBeenCalledOnce();
    expect(hints()).toEqual([]);
  });

  it("leaves the hint out for an agent past the gate, which is already in setup or forced", async () => {
    process.env.CLAUDECODE = "1";
    const { action, run } = await load();
    await run("init", ["--force"]);
    expect(action).toHaveBeenCalledOnce();
    expect(hints()).toEqual([]);
  });

  it("leaves the hint out for --force and inside a setup session", async () => {
    const { action, run, markSetupSession } = await load();
    await run("init", ["--force"]);
    markSetupSession({ setupId: "abc", cwd: process.cwd() });
    await run("create", ["my-app"]);
    expect(action).toHaveBeenCalledTimes(2);
    expect(hints()).toEqual([]);
  });

  it("leaves the hint out of a command run inside another one", async () => {
    const { action, build, run } = await load();
    const create = build("create");
    const init = new Command("init").action(async () => {
      await create.parseAsync([], { from: "user" });
    });
    await run("init", [], init);
    expect(action).toHaveBeenCalledOnce();
    expect(hints()).toEqual([]);
  });

  it("prints the hint only in the help for --help", async () => {
    const { action, build } = await load();
    const command = build("create").exitOverride();
    let help = "";
    command.configureOutput({ writeOut: (chunk) => (help += chunk) });
    process.argv = ["node", "assistant-ui", "create", "--help"];
    await expect(
      command.parseAsync(["--help"], { from: "user" }),
    ).rejects.toThrow();
    expect(action).not.toHaveBeenCalled();
    expect(help.trimEnd().endsWith(AGENT_SETUP_HINT)).toBe(true);
    expect(hints()).toEqual([]);
  });
});
