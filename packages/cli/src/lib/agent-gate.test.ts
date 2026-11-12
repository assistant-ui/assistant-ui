import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_GATE_EXIT_CODE,
  AGENT_GATE_MESSAGE,
  SETUP_SESSION_TTL_MS,
  addAgentGate,
  isSetupSessionActive,
  markSetupSession,
  setupSessionMarkerPath,
  shouldGateAgent,
  typedCommand,
} from "./agent-gate";
import { buildProgram } from "../program";

const AGENTS: Record<string, NodeJS.ProcessEnv> = {
  "Claude Code": { CLAUDECODE: "1" },
  Codex: { CODEX_SANDBOX: "seatbelt" },
  Cursor: { CURSOR_AGENT: "1" },
  "Gemini CLI": { GEMINI_CLI: "1" },
  AI_AGENT: { AI_AGENT: "amp" },
};
const NO_SESSION = () => false;

describe("shouldGateAgent", () => {
  it.each(Object.entries(AGENTS))("stops %s", (_, env) => {
    expect(shouldGateAgent({ env, setupSessionActive: NO_SESSION })).toBe(true);
  });

  it("lets people and CI through", () => {
    for (const env of [{}, { CI: "1" }, { CI: "true", GITHUB_ACTIONS: "true" }])
      expect(shouldGateAgent({ env, setupSessionActive: NO_SESSION })).toBe(
        false,
      );
  });

  it("lets an agent through with --force, ASSISTANT_UI_ALLOW_AGENT, or in a setup session", () => {
    const env = { CLAUDECODE: "1" };
    expect(
      shouldGateAgent({ env, force: true, setupSessionActive: NO_SESSION }),
    ).toBe(false);
    for (const value of ["1", "true", "yes"])
      expect(
        shouldGateAgent({
          env: { ...env, ASSISTANT_UI_ALLOW_AGENT: value },
          setupSessionActive: NO_SESSION,
        }),
      ).toBe(false);
    for (const value of ["", "0", "false"])
      expect(
        shouldGateAgent({
          env: { ...env, ASSISTANT_UI_ALLOW_AGENT: value },
          setupSessionActive: NO_SESSION,
        }),
      ).toBe(true);
    expect(shouldGateAgent({ env, setupSessionActive: () => true })).toBe(
      false,
    );
  });
});

describe("the setup session marker", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "aui-gate-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("is active once setup marks it, until the TTL lapses", () => {
    const file = setupSessionMarkerPath(dir);
    expect(isSetupSessionActive(file)).toBe(false);
    expect(markSetupSession({ setupId: "abc", cwd: "/app" }, file)).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toMatchObject({
      setupId: "abc",
      cwd: "/app",
    });
    expect(isSetupSessionActive(file, Date.now(), "/app")).toBe(true);
    const stale = new Date(Date.now() - SETUP_SESSION_TTL_MS - 1000);
    fs.utimesSync(file, stale, stale);
    expect(isSetupSessionActive(file, Date.now(), "/app")).toBe(false);
  });

  it("is scoped to the project folder setup ran in and the folders inside it", () => {
    const file = setupSessionMarkerPath(dir);
    const project = path.join(dir, "project");
    fs.mkdirSync(path.join(project, "my-app"), { recursive: true });
    fs.mkdirSync(path.join(dir, "project-other"));
    markSetupSession({ setupId: "abc", cwd: project }, file);
    expect(isSetupSessionActive(file, Date.now(), project)).toBe(true);
    expect(
      isSetupSessionActive(file, Date.now(), path.join(project, "my-app")),
    ).toBe(true);
    expect(isSetupSessionActive(file, Date.now(), dir)).toBe(false);
    expect(
      isSetupSessionActive(file, Date.now(), path.join(dir, "project-other")),
    ).toBe(false);
    expect(isSetupSessionActive(file, Date.now(), os.homedir())).toBe(false);
  });

  it("is inactive for a marker without a project folder", () => {
    const file = setupSessionMarkerPath(dir);
    fs.writeFileSync(file, JSON.stringify({ setupId: "abc" }));
    expect(isSetupSessionActive(file, Date.now(), dir)).toBe(false);
  });

  it("renews on each use, so a long install keeps passing", () => {
    const file = setupSessionMarkerPath(dir);
    markSetupSession({ setupId: "abc" }, file);
    const start = Date.now();
    expect(
      isSetupSessionActive(file, start + SETUP_SESSION_TTL_MS - 1000),
    ).toBe(true);
    expect(
      isSetupSessionActive(file, start + SETUP_SESSION_TTL_MS + 60_000),
    ).toBe(true);
  });

  it("reports false when the marker cannot be written", () => {
    expect(
      markSetupSession({ setupId: "abc" }, path.join(dir, "missing", "x.json")),
    ).toBe(false);
  });
});

describe("typedCommand", () => {
  it("is the first argument that is not a flag", () => {
    expect(typedCommand(["node", "aui", "add", "thread"])).toBe("add");
    expect(typedCommand(["node", "aui", "--force", "init"])).toBe("init");
    expect(typedCommand(["node", "aui"])).toBeUndefined();
  });
});

describe("addAgentGate", () => {
  const env = { ...process.env };
  const argv = process.argv;
  let tmp: string;
  let stderr: string;
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aui-gate-"));
    vi.spyOn(os, "tmpdir").mockReturnValue(tmp);
    // Only PATH survives, so no agent variable from the shell running the tests leaks in.
    process.env = { PATH: env.PATH };
    stderr = "";
    vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: unknown,
      done?: () => void,
    ) => {
      stderr += String(chunk);
      done?.();
      return true;
    }) as typeof process.stderr.write);
    exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as typeof process.exit);
  });
  afterEach(() => {
    process.env = { ...env };
    process.argv = argv;
    vi.restoreAllMocks();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const run = async (name: string, args: string[]) => {
    const action = vi.fn();
    const command = addAgentGate(
      new Command(name).argument("[items...]").action(action),
    );
    process.argv = ["node", "assistant-ui", name, ...args];
    let error: unknown;
    try {
      await command.parseAsync(args, { from: "user" });
    } catch (caught) {
      error = caught;
    }
    return { action, error };
  };

  describe.each(["init", "create", "add"])("%s", (name) => {
    it.each(Object.entries(AGENTS))(
      "stops %s with the setup pointer and exit code 2",
      async (_, agentEnv) => {
        Object.assign(process.env, agentEnv);
        const { action, error } = await run(name, ["thread"]);
        expect(action).not.toHaveBeenCalled();
        expect((error as Error).message).toBe(`exit ${AGENT_GATE_EXIT_CODE}`);
        expect(exit).toHaveBeenCalledWith(AGENT_GATE_EXIT_CODE);
        expect(stderr).toBe(`${AGENT_GATE_MESSAGE}\n`);
      },
    );

    it("runs for a person or in CI", async () => {
      expect((await run(name, ["thread"])).action).toHaveBeenCalledOnce();
      process.env.CI = "1";
      expect((await run(name, ["thread"])).action).toHaveBeenCalledOnce();
      expect(stderr).toBe("");
    });

    it("runs for an agent with --force", async () => {
      process.env.CLAUDECODE = "1";
      const { action } = await run(name, ["thread", "--force"]);
      expect(action).toHaveBeenCalledOnce();
      expect(stderr).toBe("");
    });

    it("runs for an agent with ASSISTANT_UI_ALLOW_AGENT=1", async () => {
      process.env.CODEX_SANDBOX = "seatbelt";
      process.env.ASSISTANT_UI_ALLOW_AGENT = "1";
      expect((await run(name, ["thread"])).action).toHaveBeenCalledOnce();
    });

    it("runs for an agent in an active setup session", async () => {
      process.env.CLAUDECODE = "1";
      markSetupSession({ setupId: "abc" });
      expect((await run(name, ["thread"])).action).toHaveBeenCalledOnce();
      expect(stderr).toBe("");
    });

    it("stops an agent outside the folder of the active setup session", async () => {
      process.env.CLAUDECODE = "1";
      markSetupSession({ setupId: "abc", cwd: path.join(tmp, "elsewhere") });
      const { action, error } = await run(name, ["thread"]);
      expect(action).not.toHaveBeenCalled();
      expect((error as Error).message).toBe(`exit ${AGENT_GATE_EXIT_CODE}`);
    });
  });

  it("does not stop a command another command runs internally", async () => {
    process.env.CLAUDECODE = "1";
    const createAction = vi.fn();
    const create = addAgentGate(
      new Command("create").argument("[dir]").action(createAction),
    );
    // Like `cloud setup`, which runs create without being gated itself.
    const cloud = new Command("cloud").action(async () => {
      await create.parseAsync(["my-app"], { from: "user" });
    });
    process.argv = ["node", "assistant-ui", "cloud"];
    await cloud.parseAsync([], { from: "user" });
    expect(createAction).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();
  });

  it("gates the real init, create and add, and keeps --force out of their help", async () => {
    process.env.CLAUDECODE = "1";
    for (const args of [
      ["init", "--yes"],
      ["create", "my-app", "-t", "default"],
      ["add", "thread"],
    ]) {
      process.argv = ["node", "assistant-ui", ...args];
      const program = buildProgram().exitOverride();
      await expect(program.parseAsync()).rejects.toThrow(
        `exit ${AGENT_GATE_EXIT_CODE}`,
      );
      const command = program.commands.find((c) => c.name() === args[0])!;
      expect(command.helpInformation()).not.toContain("--force");
    }
    expect(stderr.split(AGENT_GATE_MESSAGE)).toHaveLength(4);
  });
});
