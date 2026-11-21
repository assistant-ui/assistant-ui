import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_SETUP_HINT,
  addAgentSetupHint,
  isRunByAgent,
} from "./agent-setup-hint";
import { buildProgram } from "../program";

const tty = { isTTY: true };

describe("isRunByAgent", () => {
  it("is true under an agent or without a terminal", () => {
    expect(isRunByAgent({ CLAUDECODE: "1" }, tty, tty)).toBe(true);
    expect(isRunByAgent({}, { isTTY: undefined }, tty)).toBe(true);
    expect(isRunByAgent({}, tty, tty)).toBe(false);
  });
});

describe("addAgentSetupHint", () => {
  const env = { ...process.env };
  const argv = process.argv;
  const afterCleanup: (() => void)[] = [];
  afterEach(() => {
    for (const cleanup of afterCleanup.splice(0)) cleanup();
    process.env = { ...env };
    process.argv = argv;
    vi.restoreAllMocks();
  });

  const help = (command: Command) => {
    let text = "";
    command.configureOutput({ writeOut: (chunk) => (text += chunk) });
    command.outputHelp();
    return text;
  };

  it("ends the help with the hint for an agent only, so `--help | tail` keeps it", () => {
    const command = addAgentSetupHint(new Command("init"), {
      afterAction: false,
    });
    process.env.CLAUDECODE = "1";
    expect(help(command).endsWith(`${AGENT_SETUP_HINT}\n`)).toBe(true);
    expect(help(command).startsWith(AGENT_SETUP_HINT)).toBe(false);
    // Only PATH survives, so no agent variable from the shell running the tests leaks in.
    process.env = { PATH: env.PATH };
    const stdin = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
    const stdout = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    });
    try {
      expect(help(command)).not.toContain(AGENT_SETUP_HINT);
    } finally {
      for (const [stream, descriptor] of [
        [process.stdin, stdin],
        [process.stdout, stdout],
      ] as const) {
        if (descriptor) Object.defineProperty(stream, "isTTY", descriptor);
        else delete (stream as { isTTY?: boolean }).isTTY;
      }
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

  it("prints the hint once after the command typed without a terminal", async () => {
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    // No agent markers, so the agent gate lets it through; no terminal, so the hint shows.
    process.env = { PATH: env.PATH };
    const stdin = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
    Object.defineProperty(process.stdin, "isTTY", {
      value: undefined,
      configurable: true,
    });
    afterCleanup.push(() => {
      if (stdin) Object.defineProperty(process.stdin, "isTTY", stdin);
      else delete (process.stdin as { isTTY?: boolean }).isTTY;
    });
    process.argv = ["node", "assistant-ui", "create", "my-app"];
    const action = vi.fn(() => {
      process.stdout.write("Next steps: npm run dev\n");
    });
    const command = addAgentSetupHint(
      new Command("create").argument("[dir]").action(action),
    );
    await command.parseAsync(["my-app"], { from: "user" });
    await command.parseAsync(["my-app"], { from: "user" });
    expect(action).toHaveBeenCalledTimes(2);
    const chunks = write.mock.calls.map(([chunk]) => String(chunk));
    expect(chunks.filter((chunk) => chunk.includes(AGENT_SETUP_HINT))).toEqual([
      `\n${AGENT_SETUP_HINT}\n`,
    ]);
    // After the command's own output, where the tail of it shows.
    expect(chunks.findIndex((chunk) => chunk.includes(AGENT_SETUP_HINT))).toBe(
      1,
    );
  });

  it("leaves the hint out for an agent past the gate, which is already in setup or forced", async () => {
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    process.env.CLAUDECODE = "1";
    process.argv = ["node", "assistant-ui", "init", "--yes"];
    const action = vi.fn();
    const command = addAgentSetupHint(
      new Command("init").option("--yes").action(action),
    );
    await command.parseAsync(["--yes"], { from: "user" });
    expect(action).toHaveBeenCalledOnce();
    expect(
      write.mock.calls.filter(([chunk]) =>
        String(chunk).includes(AGENT_SETUP_HINT),
      ),
    ).toHaveLength(0);
  });
});
