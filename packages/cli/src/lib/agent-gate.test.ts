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
  clearSetupSession,
  isInsideFolder,
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
  let project: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "aui-gate-"));
    project = path.join(dir, "project");
    fs.mkdirSync(project);
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  const active = (target: string, now?: number) =>
    isSetupSessionActive({ target, dir, ...(now !== undefined && { now }) });

  it("is active once setup marks it, until it is cleared", () => {
    expect(active(project)).toBe(false);
    const file = markSetupSession({ setupId: "abc", cwd: project }, dir);
    expect(file).toBe(setupSessionMarkerPath(project, "abc", dir));
    expect(JSON.parse(fs.readFileSync(file!, "utf8"))).toMatchObject({
      setupId: "abc",
      cwd: fs.realpathSync(project),
    });
    expect(active(project)).toBe(true);
    clearSetupSession(file!);
    expect(fs.existsSync(file!)).toBe(false);
    expect(active(project)).toBe(false);
    // Clearing twice is harmless.
    clearSetupSession(file!);
  });

  it.each([
    ["older", "newer"],
    ["newer", "older"],
  ])(
    "keeps a project's session while any of its setups runs (the %s one exits first)",
    (first, second) => {
      const files = {
        older: markSetupSession({ setupId: "old", cwd: project }, dir)!,
        newer: markSetupSession({ setupId: "new", cwd: project }, dir)!,
      };
      expect(files.older).not.toBe(files.newer);
      clearSetupSession(files[first as "older"]);
      expect(active(project)).toBe(true);
      clearSetupSession(files[second as "older"]);
      expect(active(project)).toBe(false);
    },
  );

  it("lasts two hours from when setup started it, however often it is used", () => {
    const start = Date.now();
    const file = markSetupSession(
      { setupId: "abc", cwd: project, now: start },
      dir,
    )!;
    const { mtimeMs } = fs.statSync(file);
    for (let t = start; t <= start + SETUP_SESSION_TTL_MS; t += 10 * 60 * 1000)
      expect(active(project, t)).toBe(true);
    expect(fs.statSync(file).mtimeMs).toBe(mtimeMs);
    expect(active(project, start + SETUP_SESSION_TTL_MS + 1)).toBe(false);
    // Touching the file does not extend it either.
    const later = new Date(start + SETUP_SESSION_TTL_MS + 1);
    fs.utimesSync(file, later, later);
    expect(active(project, start + SETUP_SESSION_TTL_MS + 1)).toBe(false);
  });

  it("is scoped to the project folder setup ran in and the folders inside it", () => {
    fs.mkdirSync(path.join(project, "my-app"));
    fs.mkdirSync(path.join(project, "..cache"));
    fs.mkdirSync(path.join(dir, "project-other"));
    markSetupSession({ setupId: "abc", cwd: project }, dir);
    expect(active(project)).toBe(true);
    expect(active(path.join(project, "my-app"))).toBe(true);
    expect(active(path.join(project, "..cache"))).toBe(true);
    // A folder `create` has not made yet.
    expect(active(path.join(project, "new-app", "src"))).toBe(true);
    expect(active(dir)).toBe(false);
    expect(active(path.join(dir, "project-other"))).toBe(false);
    expect(active(path.join(project, "..", "project-other"))).toBe(false);
    expect(active(os.homedir())).toBe(false);
  });

  it("keeps markers per project, so concurrent setups do not replace each other", () => {
    const other = path.join(dir, "other");
    fs.mkdirSync(other);
    const a = markSetupSession({ setupId: "a", cwd: project }, dir);
    const b = markSetupSession({ setupId: "b", cwd: other }, dir);
    expect(a).not.toBe(b);
    expect(active(project)).toBe(true);
    expect(active(other)).toBe(true);
    clearSetupSession(b!);
    expect(active(project)).toBe(true);
    expect(active(other)).toBe(false);
    expect(setupSessionMarkerPath(path.join(project, "."), "a", dir)).toBe(a);
  });

  it("is inactive for a marker that is malformed or for another folder", () => {
    const file = setupSessionMarkerPath(project, "abc", dir);
    fs.writeFileSync(file, JSON.stringify({ setupId: "abc" }));
    expect(active(project)).toBe(false);
    fs.writeFileSync(file, "not json");
    expect(active(project)).toBe(false);
    fs.writeFileSync(
      file,
      JSON.stringify({ setupId: "abc", cwd: dir, startedAt: Date.now() }),
    );
    // Its name says project, but it records the parent, so it covers neither.
    expect(active(project)).toBe(false);
    expect(active(dir)).toBe(false);
  });

  it("reports undefined when the marker cannot be written", () => {
    expect(
      markSetupSession(
        { setupId: "abc", cwd: project },
        path.join(dir, "missing"),
      ),
    ).toBeUndefined();
  });
});

describe("isInsideFolder", () => {
  it("treats only a first segment of exactly .. as outside", () => {
    const root = path.resolve("/srv/app");
    expect(isInsideFolder(root, root)).toBe(true);
    expect(isInsideFolder(path.join(root, "..cache"), root)).toBe(true);
    expect(isInsideFolder(path.join(root, "..", "app-b"), root)).toBe(false);
    expect(isInsideFolder(path.resolve("/srv"), root)).toBe(false);
    expect(isInsideFolder(path.resolve("/srv/app-b"), root)).toBe(false);
    expect(isInsideFolder(path.join(root, "a", "..b", "c"), root)).toBe(true);
  });
});

describe("the gate message", () => {
  it("tells a person with an inherited agent environment how to get past it", () => {
    expect(AGENT_GATE_MESSAGE).toContain("--force");
    expect(AGENT_GATE_MESSAGE).toContain("ASSISTANT_UI_ALLOW_AGENT=1");
    expect(AGENT_GATE_MESSAGE).toContain("npx assistant-ui@latest setup");
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

  const run = async (
    name: string,
    args: string[],
    { projectArgument = false }: { projectArgument?: boolean } = {},
  ) => {
    const action = vi.fn();
    const command = addAgentGate(
      new Command(name)
        .argument("[items...]")
        .option("-c, --cwd <cwd>")
        .action(action),
      { projectArgument },
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

    it.each(["--cwd", "-c"])(
      "checks the folder %s points at, not the current one",
      async (flag) => {
        process.env.CLAUDECODE = "1";
        const projectA = path.join(tmp, "project-a");
        const projectB = path.join(tmp, "project-b");
        fs.mkdirSync(path.join(projectA, "app"), { recursive: true });
        fs.mkdirSync(projectB);
        const cwd = vi.spyOn(process, "cwd").mockReturnValue(projectA);
        markSetupSession({ setupId: "abc", cwd: projectA });
        // Sitting in project A, where setup runs, does not cover project B.
        const outside = await run(name, ["thread", flag, "../project-b"]);
        expect(outside.action).not.toHaveBeenCalled();
        expect((outside.error as Error).message).toBe(
          `exit ${AGENT_GATE_EXIT_CODE}`,
        );
        expect(
          (await run(name, ["thread", flag, "app"])).action,
        ).toHaveBeenCalledOnce();
        // Setup in project B covers --cwd project-b from anywhere.
        cwd.mockReturnValue(tmp);
        markSetupSession({ setupId: "def", cwd: projectB });
        expect(
          (await run(name, ["thread", flag, projectB])).action,
        ).toHaveBeenCalledOnce();
      },
    );
  });

  it.each(["init", "create"])(
    "%s checks the project directory it is given",
    async (name) => {
      process.env.CLAUDECODE = "1";
      const project = path.join(tmp, "project");
      fs.mkdirSync(project);
      vi.spyOn(process, "cwd").mockReturnValue(project);
      markSetupSession({ setupId: "abc", cwd: project });
      expect(
        (await run(name, ["my-app"], { projectArgument: true })).action,
      ).toHaveBeenCalledOnce();
      const { action, error } = await run(name, ["../other-app"], {
        projectArgument: true,
      });
      expect(action).not.toHaveBeenCalled();
      expect((error as Error).message).toBe(`exit ${AGENT_GATE_EXIT_CODE}`);
    },
  );

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
