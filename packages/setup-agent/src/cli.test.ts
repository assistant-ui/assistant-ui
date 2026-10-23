import { createHash } from "node:crypto";
import { connectCheckout } from "./client";
import { initialCheckoutState, type Checkout } from "./protocol";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  chmod,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  HELP,
  INSTRUCTIONS,
  main,
  askSeed,
  agentInstructions,
  diffEvents,
  detectAgentKind,
  isDirectInvocation,
  upsertEnvLine,
  waitForStart,
  writeEnvSecret,
} from "./cli";

vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  connectCheckout: vi.fn(),
}));

vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return { ...original, tmpdir: vi.fn(original.tmpdir) };
});

describe("the agent's briefing", () => {
  it("preserves the published instructions export and setup-created event wording", () => {
    expect(INSTRUCTIONS).toBe(agentInstructions);
    expect(typeof HELP).toBe("string");
    expect(INSTRUCTIONS("https://example.test/session")).toContain(
      '"setup.created"',
    );
    expect(INSTRUCTIONS("https://example.test/session")).not.toContain(
      '"checkout.created"',
    );
  });

  it("describes a setup without the wording of a purchase", () => {
    const briefing = HELP + INSTRUCTIONS("https://example.test/session");
    expect(briefing).not.toMatch(/\b(?:cart|shop|checkout|purchase)\b/i);
  });
});

describe("askSeed", () => {
  const parse = (argv: string[]) => {
    const flags = new Map<string, string | true>();
    const rest: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i]!;
      if (!arg.startsWith("--")) rest.push(arg);
      else if (argv[i + 1]?.startsWith("--") === false)
        flags.set(arg.slice(2), argv[++i]!);
      else flags.set(arg.slice(2), true);
    }
    return askSeed(rest, flags);
  };

  const withExit = (run: () => void) => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      expect(run).toThrow("exit");
      return stderr.mock.lastCall?.[0];
    } finally {
      exit.mockRestore();
      stderr.mockRestore();
    }
  };

  const entryPoints = [
    {
      id: "ticket-modal",
      label: "Ticket reply modal",
      description: "Draft a response without leaving the support ticket.",
      entryPoint: {
        formFactor: "modal",
        placement: "Above the ticket detail page",
        trigger: "Draft reply button in the ticket toolbar",
        recommended: true,
      },
    },
  ];

  it("asks an entry-point question preserving contextual choices and exact default", () => {
    expect(
      parse([
        "Where should support agents draft replies?",
        "--entry-points",
        JSON.stringify(entryPoints),
        "--default",
        "ticket-modal",
        "--step",
        "s1",
        "--wait",
      ]),
    ).toEqual({
      kind: "entry-point",
      prompt: "Where should support agents draft replies?",
      options: entryPoints,
      default: "ticket-modal",
      stepId: "s1",
      optional: false,
    });
  });

  it("refuses malformed JSON, defaults and conflicting input flags", () => {
    expect(withExit(() => parse(["Where?", "--entry-points", "{"]))).toContain(
      "JSON array",
    );
    expect(withExit(() => parse(["Where?", "--entry-points"]))).toContain(
      "JSON array",
    );
    expect(withExit(() => parse(["Where?", "--entry-points", "[]"]))).toContain(
      "unique options",
    );
    expect(
      withExit(() =>
        parse([
          "Where?",
          "--entry-points",
          JSON.stringify(entryPoints),
          "--default",
          "unknown",
        ]),
      ),
    ).toContain('no option "unknown"');
    for (const flag of [
      "--preset",
      "--choices",
      "--product",
      "--multiple",
      "--icons",
      "--placeholder",
      "--single",
      "--only",
    ]) {
      expect(
        withExit(() =>
          parse([
            "Where?",
            "--entry-points",
            JSON.stringify(entryPoints),
            flag,
            "x",
          ]),
        ),
      ).toContain("cannot be combined");
    }
  });

  it("keeps the legacy product command decoder", () => {
    expect(parse(["Add it?", "--product", "assistant-ui"])).toEqual({
      kind: "product",
      prompt: "Add it?",
      product: "assistant-ui",
      optional: false,
    });
  });

  it("asks a multi-select choice with an icon on every option by default", () => {
    expect(
      parse([
        "Which integrations?",
        "--choices",
        "slack,email",
        "--icons",
        "slack=message,email=mail",
      ]),
    ).toEqual({
      kind: "choice",
      prompt: "Which integrations?",
      options: [
        { id: "slack", label: "slack", icon: "message" },
        { id: "email", label: "email", icon: "mail" },
      ],
      multiple: true,
      optional: false,
    });
    expect(
      parse([
        "Pick",
        "--choices",
        "a,b",
        "--icons",
        "a=code,b=zap",
        "--multiple",
      ]),
    ).toHaveProperty("multiple", true);
  });

  it("asks a single choice only with --single", () => {
    const seed = parse([
      "Which package manager?",
      "--choices",
      "pnpm,npm",
      "--icons",
      "pnpm=package,npm=package",
      "--single",
      "--default",
      "pnpm",
    ]);
    expect(seed).not.toHaveProperty("multiple");
    expect(seed).toHaveProperty("default", "pnpm");
    expect(
      withExit(() =>
        parse([
          "Pick",
          "--choices",
          "a",
          "--icons",
          "a=code",
          "--single",
          "--multiple",
        ]),
      ),
    ).toContain("--single and --multiple exclude each other");
  });

  it("refuses a choice missing an icon, naming the pack and the flag to pass", () => {
    const message = withExit(() =>
      parse(["Pick", "--choices", "a,b,c", "--icons", "b=mail"]),
    );
    expect(message).toContain('"a", "c" have none');
    expect(message).toContain('--icons "a=<icon>,b=<icon>,c=<icon>"');
    expect(message).toContain("code, terminal, braces");
    expect(message).toContain("question");
  });

  it("refuses an icon outside the pack or on an unknown choice", () => {
    expect(
      withExit(() => parse(["Pick", "--choices", "a", "--icons", "a=rocket"])),
    ).toContain('unknown icon "rocket"');
    expect(
      withExit(() => parse(["Pick", "--choices", "a", "--icons", "b=mail"])),
    ).toContain('no choice "b"');
  });

  it("leaves presets single-select with their own brand marks", () => {
    const framework = parse(["--preset", "framework"]);
    expect(framework).not.toHaveProperty("multiple");
    expect(framework.options?.[0]).toHaveProperty("icon", "vercel");
    const project = parse([
      "--preset",
      "project",
      "--choices",
      "apps/web=Next.js",
    ]);
    expect(project).not.toHaveProperty("multiple");
    expect(project.options?.[0]).toEqual({
      id: "apps/web",
      label: "apps/web",
      description: "Next.js",
    });
  });
});

describe("upsertEnvLine", () => {
  it.each(["", "1KEY", "KEY.*", "(A+)+$", "KEY=VALUE", "KEY\nOTHER", "KEY "])(
    "rejects invalid environment keys in the exported helper: %j",
    (key) => {
      expect(() => upsertEnvLine("KEY=old\n", key, "new")).toThrow(
        "not an environment variable name",
      );
    },
  );

  it("matches assignment keys literally, including export and whitespace", () => {
    expect(
      upsertEnvLine("KEY_LONG=keep\nexport KEY \t=old\n", "KEY", "new"),
    ).toBe("KEY_LONG=keep\nKEY=new\n");
    expect(upsertEnvLine("KEY_LONG=keep\n", "KEY", "new")).toBe(
      "KEY_LONG=keep\nKEY=new\n",
    );
    expect(upsertEnvLine("export =old\n", "export", "new")).toBe(
      "export=new\n",
    );
  });
  it("appends, replaces, and keeps the rest of the file", () => {
    expect(upsertEnvLine("", "OPENAI_API_KEY", "sk-1")).toBe(
      "OPENAI_API_KEY=sk-1\n",
    );
    expect(
      upsertEnvLine(
        "A=1\nexport OPENAI_API_KEY = old\nB=2",
        "OPENAI_API_KEY",
        "sk-2",
      ),
    ).toBe("A=1\nOPENAI_API_KEY=sk-2\nB=2\n");
    expect(upsertEnvLine("A=1\n", "B", "2")).toBe("A=1\nB=2\n");
  });
});

describe("detectAgentKind", () => {
  it("names the agent from the variables it exports", () => {
    expect(detectAgentKind({ CLAUDECODE: "1" })).toBe("claude");
    expect(detectAgentKind({ CODEX_SANDBOX_NETWORK_DISABLED: "1" })).toBe(
      "codex",
    );
    expect(detectAgentKind({ CURSOR_AGENT: "1" })).toBe("cursor");
    expect(detectAgentKind({ GEMINI_CLI: "1" })).toBe("gemini");
    expect(detectAgentKind({ CLAUDECODE: "" })).toBeUndefined();
    expect(detectAgentKind({})).toBeUndefined();
  });
});

describe("isDirectInvocation", () => {
  it("is true only in a terminal with no agent in the environment", () => {
    expect(isDirectInvocation({}, { isTTY: true }, { isTTY: true })).toBe(true);
    expect(
      isDirectInvocation({ CLAUDECODE: "1" }, { isTTY: true }, { isTTY: true }),
    ).toBe(false);
    expect(isDirectInvocation({}, { isTTY: undefined }, { isTTY: true })).toBe(
      false,
    );
    expect(isDirectInvocation({}, { isTTY: true }, { isTTY: false })).toBe(
      false,
    );
  });
});

describe("chat stream events", () => {
  it("delivers new user messages once and replays only unacknowledged messages", () => {
    const before = initialCheckoutState();
    const after: Checkout.State = {
      ...before,
      log: [
        { id: "l1", role: "agent", phase: "planning", at: 1, text: "Ready" },
        { id: "l2", role: "user", phase: "planning", at: 2, text: "Use pnpm" },
        {
          id: "l3",
          role: "user",
          phase: "planning",
          at: 3,
          text: "Keep the theme",
          acknowledgedAt: 4,
        },
      ],
    };
    expect(diffEvents(before, after)).toEqual([
      { event: "message.created", messageId: "l2", text: "Use pnpm" },
    ]);
    expect(diffEvents(after, after)).toEqual([]);
  });
});

describe("begin planning", () => {
  it("surfaces a multiple choice answer as an array and flags the user's own text", () => {
    const before = initialCheckoutState();
    const asked: Checkout.Input = {
      phase: "planning",
      id: "q1",
      kind: "choice",
      prompt: "Which integrations?",
      options: [
        { id: "slack", label: "slack" },
        { id: "email", label: "email" },
      ],
      multiple: true,
      optional: false,
      status: "open",
      createdAt: 1,
    };
    const answered = (answer: string): Checkout.State => ({
      ...before,
      inputs: [{ ...asked, status: "answered", answer, answeredAt: 2 }],
    });
    expect(diffEvents(before, answered('["slack","email"]'))).toEqual([
      {
        event: "input.answered",
        inputId: "q1",
        prompt: "Which integrations?",
        answer: ["slack", "email"],
      },
    ]);
    expect(diffEvents(before, answered('["email","Discord"]'))).toEqual([
      {
        event: "input.answered",
        inputId: "q1",
        prompt: "Which integrations?",
        answer: ["email", "Discord"],
        custom: true,
      },
    ]);
  });

  it("emits a start event only when the browser starts planning", () => {
    const waiting = initialCheckoutState();
    const connected = {
      ...waiting,
      agent: { ...waiting.agent, connected: true, lastSeenAt: 1 },
    };
    expect(diffEvents(waiting, connected)).toEqual([]);
    const planning: Checkout.State = { ...connected, status: "planning" };
    expect(diffEvents(connected, planning)).toEqual([
      { event: "planning.started" },
    ]);
    expect(diffEvents(planning, planning)).toEqual([]);
    expect(diffEvents(waiting, { ...waiting, status: "done" })).toEqual([
      { event: "finished", next: expect.stringContaining("Keep the stream") },
    ]);
    expect(diffEvents(waiting, { ...waiting, status: "cancelled" })).toEqual([
      { event: "cancelled", next: expect.stringContaining("Keep the stream") },
    ]);
  });

  it("announces the next setup the browser creates on the same link", () => {
    const done: Checkout.State = {
      ...initialCheckoutState(),
      id: "c1",
      status: "done",
      log: [{ id: "l1", role: "user", phase: "installing", at: 1, text: "x" }],
    };
    const next: Checkout.State = {
      ...initialCheckoutState(),
      id: "c2",
      products: [{ slug: "cloud", name: "Cloud" }],
    };
    expect(diffEvents(done, next)).toEqual([
      { event: "setup.created", products: ["cloud"] },
    ]);
    expect(diffEvents(next, next)).toEqual([]);
    expect(diffEvents(initialCheckoutState(), initialCheckoutState())).toEqual(
      [],
    );
  });

  it.each(["planning", "cancelled"] as const)(
    "blocks while waiting, then releases on %s",
    async (status) => {
      let state: Checkout.State | undefined;
      let notify = () => {};
      const unsubscribe = vi.fn();
      const settled = vi.fn();
      const result = waitForStart({
        get state() {
          return state;
        },
        subscribe: (listener) => {
          notify = listener;
          return unsubscribe;
        },
      }).then(settled);
      state = initialCheckoutState();
      notify();
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
      expect(unsubscribe).not.toHaveBeenCalled();
      state = { ...state, status };
      notify();
      await result;
      expect(settled).toHaveBeenCalledWith(status);
      expect(unsubscribe).toHaveBeenCalledOnce();
    },
  );

  it.each(["planning", "installing"] as const)(
    "resolves immediately when rejoining a %s session",
    async (status) => {
      const unsubscribe = vi.fn();
      await expect(
        waitForStart({
          state: { ...initialCheckoutState(), status },
          subscribe: () => unsubscribe,
        }),
      ).resolves.toBe(status);
      expect(unsubscribe).toHaveBeenCalledOnce();
    },
  );

  it.each(["done", "cancelled"] as const)(
    "waits past a %s setup for the next one to begin",
    async (status) => {
      let state: Checkout.State = {
        ...initialCheckoutState(),
        id: "c1",
        status,
      };
      let notify = () => {};
      const settled = vi.fn();
      const result = waitForStart({
        get state() {
          return state;
        },
        subscribe: (listener) => {
          notify = listener;
          return () => {};
        },
      }).then(settled);
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
      state = { ...initialCheckoutState(), id: "c2" };
      notify();
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
      state = { ...state, status: "cancelled" };
      notify();
      await result;
      expect(settled).toHaveBeenCalledWith("cancelled");
    },
  );
});

describe("agent instructions", () => {
  it("discovers related products and asks contextual entry points before the plan", () => {
    const instructions = agentInstructions(
      "http://localhost:18892/checkout/session",
    );
    expect(instructions).toContain(
      "products are starting names and guide references",
    );
    expect(instructions).toContain(
      "The starting list does not restrict the implementation",
    );
    expect(instructions).toContain("only 1–3 sensible alternatives");
    expect(instructions).toContain(
      "two options may use the same form factor in different places",
    );
    expect(instructions).toContain("--entry-points '<JSON array>'");
    expect(instructions).not.toContain("--product assistant-ui");
    expect(instructions.indexOf("--entry-points")).toBeLessThan(
      instructions.indexOf("plan --file"),
    );
  });

  it("waits for the entry-point answer before the plan is submitted", () => {
    const ask = agentInstructions("http://localhost:18892/checkout/session")
      .split("\n")
      .find((line) => line.includes("--entry-points '<JSON array>'"));
    expect(ask?.trim().endsWith("--wait")).toBe(true);
    expect(ask).not.toContain("--default");
  });

  it("skips the entry-point question for a setup that puts no assistant in the app", () => {
    const instructions = agentInstructions(
      "http://localhost:18892/checkout/session",
    );
    expect(instructions).toContain(
      "When the setup puts an assistant in the app, ask how users should access it",
    );
    expect(instructions).toContain(
      "Skip this question when no product's guide installs an assistant",
    );
    expect(instructions).toContain(
      "When you ask it, do not submit the plan before the user picks an entry point.",
    );
    expect(instructions).not.toContain(
      "recommendation. Do not submit the plan before the user picks an entry point.",
    );
  });
});

describe("writeEnvSecret", () => {
  const tempDir = async () => {
    const dir = await mkdtemp(join(tmpdir(), "setup-agent-"));
    onTestFinished(() => rm(dir, { recursive: true, force: true }));
    return dir;
  };

  it("leaves the secret deposited when the file cannot be opened", async () => {
    const dir = await tempDir();
    const take = vi.fn(async () => "sk-test");
    await expect(
      writeEnvSecret(
        join(dir, "missing", ".env.local"),
        "OPENAI_API_KEY",
        take,
      ),
    ).rejects.toThrow();
    expect(take).not.toHaveBeenCalled();
  });

  it("refuses a symbolic link without taking the secret or changing its target", async () => {
    const dir = await tempDir();
    const target = join(dir, "target");
    const file = join(dir, ".env.local");
    await writeFile(target, "ORIGINAL=1\n");
    await chmod(target, 0o644);
    await symlink(target, file);
    const take = vi.fn(async () => "sk-test");
    await expect(writeEnvSecret(file, "OPENAI_API_KEY", take)).rejects.toThrow(
      `${file} is a symbolic link; pass --file with its target to write there`,
    );
    expect(take).not.toHaveBeenCalled();
    expect(await readFile(target, "utf8")).toBe("ORIGINAL=1\n");
    expect((await stat(target)).mode & 0o777).toBe(0o644);
  });

  it("refuses a parent directory linked outside the project", async () => {
    const project = await tempDir();
    const outside = await tempDir();
    await symlink(outside, join(project, "config"), "dir");
    const take = vi.fn(async () => "sk-test");
    await expect(
      writeEnvSecret(
        join(project, "config", ".env.local"),
        "OPENAI_API_KEY",
        take,
        project,
      ),
    ).rejects.toThrow("outside the project");
    expect(take).not.toHaveBeenCalled();
  });

  it.skipIf(process.platform === "win32")(
    "creates the file readable only by its owner",
    async () => {
      const file = join(await tempDir(), ".env.local");
      await writeEnvSecret(file, "OPENAI_API_KEY", async () => "sk-test");
      expect((await stat(file)).mode & 0o777).toBe(0o600);
      expect(await readFile(file, "utf8")).toBe("OPENAI_API_KEY=sk-test\n");
    },
  );

  it("keeps the rest of an existing file and restricts it to its owner", async () => {
    const file = join(await tempDir(), ".env.local");
    await writeFile(file, "A=1\nOPENAI_API_KEY=old\nB=2\n");
    await chmod(file, 0o644);
    await writeEnvSecret(file, "OPENAI_API_KEY", async () => "sk-test");
    expect(await readFile(file, "utf8")).toBe(
      "A=1\nOPENAI_API_KEY=sk-test\nB=2\n",
    );
    if (process.platform !== "win32") {
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    }
  });

  it("refuses an invalid key before taking the secret", async () => {
    const take = vi.fn(async () => "sk-test");
    await expect(
      writeEnvSecret(join(await tempDir(), ".env.local"), "BAD KEY", take),
    ).rejects.toThrow("not an environment variable name");
    expect(take).not.toHaveBeenCalled();
  });

  it("keeps lines another writer added while the secret was being taken", async () => {
    const file = join(await tempDir(), ".env.local");
    await writeEnvSecret(file, "OPENAI_API_KEY", async () => {
      await writeFile(file, "OTHER_KEY=1\n");
      return "sk-test";
    });
    expect(await readFile(file, "utf8")).toBe(
      "OTHER_KEY=1\nOPENAI_API_KEY=sk-test\n",
    );
  });
});

describe("model key handoff", () => {
  const fixture = async (stateHomePath?: (root: string) => Promise<string>) => {
    const root = await mkdtemp(join(tmpdir(), "setup-agent-state-"));
    const stateHome = stateHomePath
      ? await stateHomePath(root)
      : await realpath(root);
    const stateHomeVariable =
      process.platform === "win32" ? "LOCALAPPDATA" : "XDG_STATE_HOME";
    const prior = process.env[stateHomeVariable];
    process.env[stateHomeVariable] = stateHome;
    const state: Checkout.State = {
      ...initialCheckoutState(),
      id: "setup-a",
      createdAt: 1,
      status: "planning",
    };
    const ask = vi.fn(async (seed: Checkout.InputSeed) => {
      state.inputs.push({
        ...seed,
        id: "q1",
        phase: "planning",
        kind: "model",
        optional: false,
        status: "open",
        createdAt: 2,
      });
      return { inputId: "q1" };
    });
    const client = { state, commands: { "agent/ask": ask }, dispose: vi.fn() };
    vi.mocked(connectCheckout).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof connectCheckout>>,
    );
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    onTestFinished(async () => {
      stdout.mockRestore();
      vi.mocked(connectCheckout).mockReset();
      vi.unstubAllGlobals();
      vi.mocked(tmpdir).mockRestore();
      if (prior === undefined) delete process.env[stateHomeVariable];
      else process.env[stateHomeVariable] = prior;
      await rm(root, { recursive: true, force: true });
    });
    return { state, ask, stateHome, root };
  };

  const setup = async (stateHomePath?: (root: string) => Promise<string>) => {
    const context = await fixture(stateHomePath);
    await main([
      "https://checkout.test/session",
      "ask",
      "--preset",
      "llm-provider",
    ]);
    const directory = join(context.stateHome, "setup-agent");
    const files = await readdir(directory);
    const keyFile = join(directory, files[0]!);
    const redeemKey = await readFile(keyFile, "utf8");
    return { ...context, directory, files, keyFile, redeemKey };
  };

  const answerModel = (state: Checkout.State) => {
    state.inputs[0]!.status = "answered";
    state.inputs[0]!.answer = JSON.stringify({
      provider: "openai",
      model: "gpt-test",
    });
  };

  const fallbackDirectory = async () => {
    const root = await mkdtemp(join(tmpdir(), "setup-agent-fallback-"));
    vi.mocked(tmpdir).mockReturnValue(root);
    onTestFinished(() => rm(root, { recursive: true, force: true }));
    return join(
      root,
      `setup-agent-${process.platform === "win32" ? (await import("node:os")).userInfo().username : process.getuid!()}`,
    );
  };

  const redeem = async (state: Checkout.State, url: string) => {
    answerModel(state);
    const fetch = vi.fn(
      async (_input: string, _init?: RequestInit) =>
        new Response("provider-key"),
    );
    vi.stubGlobal("fetch", fetch);
    const directory = await mkdtemp(join(tmpdir(), "setup-agent-env-"));
    onTestFinished(() => rm(directory, { recursive: true, force: true }));
    const file = join(directory, ".env.local");
    await main([url, "env", "q1", "OPENAI_API_KEY", "--file", file]);
    expect(await readFile(file, "utf8")).toBe("OPENAI_API_KEY=provider-key\n");
    return fetch;
  };

  it.skipIf(process.platform === "win32")(
    "stores the model redeem key privately under the user state home",
    async () => {
      const { ask, directory, files, keyFile, redeemKey } = await setup();
      expect(files).toHaveLength(1);
      expect((await stat(directory)).mode & 0o777).toBe(0o700);
      expect((await stat(keyFile)).mode & 0o777).toBe(0o600);
      expect(redeemKey).toMatch(/^[0-9a-f]{64}$/);
      expect(ask.mock.calls[0]?.[0].redeemKeyHash).toBe(
        createHash("sha256").update(redeemKey).digest("hex"),
      );
      expect(files).toEqual([`${ask.mock.calls[0]?.[0].redeemKeyHash}.key`]);
    },
  );

  it.skipIf(process.platform === "win32")(
    "stores and redeems through a symlinked state home ancestor",
    async () => {
      const { state, keyFile, redeemKey } = await setup(async (root) => {
        await mkdir(join(root, "real", "state"), { recursive: true });
        await symlink(join(root, "real"), join(root, "link"));
        return join(root, "link", "state");
      });
      const fetch = await redeem(state, "https://checkout.test/session");
      expect(fetch.mock.calls[0]?.[1]).toEqual({
        headers: { "Setup-Agent-Redeem-Key": redeemKey },
      });
      expect(await readdir(join(keyFile, ".."))).toEqual([]);
    },
  );

  it.skipIf(process.platform === "win32")(
    "rejects a symlinked setup-agent directory and uses the temp fallback",
    async () => {
      const { state, ask, stateHome, root } = await fixture();
      const target = join(root, "target");
      await mkdir(target);
      await symlink(target, join(stateHome, "setup-agent"));
      const fallback = await fallbackDirectory();
      await main([
        "https://checkout.test/session",
        "ask",
        "--preset",
        "llm-provider",
      ]);
      const hash = ask.mock.calls[0]?.[0].redeemKeyHash;
      expect(await readdir(target)).toEqual([]);
      expect(await readdir(fallback)).toEqual([`${hash}.key`]);
      const key = await readFile(join(fallback, `${hash}.key`), "utf8");
      const fetch = await redeem(state, "https://checkout.test/session");
      expect(fetch.mock.calls[0]?.[1]).toEqual({
        headers: { "Setup-Agent-Redeem-Key": key },
      });
      expect(await readdir(fallback)).toEqual([]);
    },
  );

  it("asks without a hash and warns once when neither directory can store a key", async () => {
    const { ask, stateHome } = await fixture();
    const fallback = await fallbackDirectory();
    await writeFile(join(stateHome, "setup-agent"), "occupied");
    await writeFile(fallback, "occupied");
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    onTestFinished(() => stderr.mockRestore());
    await main([
      "https://checkout.test/session",
      "ask",
      "--preset",
      "llm-provider",
    ]);
    expect(ask).toHaveBeenCalledOnce();
    expect(ask.mock.calls[0]?.[0]).not.toHaveProperty("redeemKeyHash");
    expect(stderr.mock.calls).toHaveLength(1);
    expect(stderr.mock.calls[0]?.[0]).toMatch(
      /^warning: could not store a redeem key: .*setup-agent-/,
    );
  });

  it("removes a stored key when agent/ask fails", async () => {
    const { ask, stateHome } = await fixture();
    let storedKey: string | undefined;
    ask.mockImplementation(async (seed) => {
      storedKey = await readFile(
        join(stateHome, "setup-agent", `${seed.redeemKeyHash}.key`),
        "utf8",
      );
      throw new Error("ask rejected");
    });
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    onTestFinished(() => {
      exit.mockRestore();
      stderr.mockRestore();
    });
    await expect(
      main([
        "https://checkout.test/session",
        "ask",
        "--preset",
        "llm-provider",
      ]),
    ).rejects.toThrow("exit");
    expect(storedKey).toMatch(/^[0-9a-f]{64}$/);
    expect(await readdir(join(stateHome, "setup-agent"))).toEqual([]);
  });

  it("pairs ask and env across a trailing slash in the endpoint", async () => {
    const { state, redeemKey, keyFile } = await setup();
    const fetch = await redeem(state, "https://checkout.test/session/");
    expect(fetch.mock.calls[0]?.[1]).toEqual({
      headers: { "Setup-Agent-Redeem-Key": redeemKey },
    });
    expect(await readdir(join(keyFile, ".."))).toEqual([]);
  });

  it("succeeds when the key file disappears before env cleanup", async () => {
    const { state, keyFile } = await setup();
    answerModel(state);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await unlink(keyFile);
        return new Response("provider-key");
      }),
    );
    const directory = await mkdtemp(join(tmpdir(), "setup-agent-env-"));
    onTestFinished(() => rm(directory, { recursive: true, force: true }));
    const file = join(directory, ".env.local");
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    onTestFinished(() => stderr.mockRestore());
    await main([
      "https://checkout.test/session",
      "env",
      "q1",
      "OPENAI_API_KEY",
      "--file",
      file,
    ]);
    expect(await readFile(file, "utf8")).toBe("OPENAI_API_KEY=provider-key\n");
    expect(stderr).not.toHaveBeenCalled();
  });

  it("sends the stored key on env redemption and removes it after writing", async () => {
    const { state, keyFile, redeemKey } = await setup();
    state.inputs[0]!.status = "answered";
    state.inputs[0]!.answer = JSON.stringify({
      provider: "openai",
      model: "gpt-test",
    });
    const fetch = vi.fn(
      async (_input: string, _init?: RequestInit) =>
        new Response("provider-key"),
    );
    vi.stubGlobal("fetch", fetch);
    const file = join(
      await mkdtemp(join(tmpdir(), "setup-agent-env-")),
      ".env.local",
    );
    onTestFinished(() =>
      rm(join(file, ".."), { recursive: true, force: true }),
    );
    await main([
      "https://checkout.test/session",
      "env",
      "q1",
      "OPENAI_API_KEY",
      "--file",
      file,
    ]);
    expect(fetch.mock.calls[0]?.[1]).toEqual({
      headers: { "Setup-Agent-Redeem-Key": redeemKey },
    });
    expect(await readFile(file, "utf8")).toBe("OPENAI_API_KEY=provider-key\n");
    expect(await readdir(join(keyFile, ".."))).toEqual([]);
  });

  it("keeps the stored key after a forbidden redemption", async () => {
    const { state, keyFile, redeemKey } = await setup();
    state.inputs[0]!.status = "answered";
    state.inputs[0]!.answer = JSON.stringify({
      provider: "openai",
      model: "gpt-test",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    );
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    onTestFinished(() => {
      exit.mockRestore();
      stderr.mockRestore();
    });
    const file = join(
      await mkdtemp(join(tmpdir(), "setup-agent-env-")),
      ".env.local",
    );
    onTestFinished(() =>
      rm(join(file, ".."), { recursive: true, force: true }),
    );
    await expect(
      main([
        "https://checkout.test/session",
        "env",
        "q1",
        "OPENAI_API_KEY",
        "--file",
        file,
      ]),
    ).rejects.toThrow("exit");
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining('redeem key rejected for "q1"'),
    );
    expect(await readFile(keyFile, "utf8")).toBe(redeemKey);
  });

  it.skipIf(process.platform === "win32")(
    "refuses a symbolic link for the stored key",
    async () => {
      const { state, keyFile } = await setup();
      state.inputs[0]!.status = "answered";
      state.inputs[0]!.answer = JSON.stringify({
        provider: "openai",
        model: "gpt-test",
      });
      const target = join(keyFile, "..", "other-key");
      await writeFile(target, "other-value");
      await unlink(keyFile);
      await symlink(target, keyFile);
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const exit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      onTestFinished(() => {
        exit.mockRestore();
        stderr.mockRestore();
      });
      await expect(
        main(["https://checkout.test/session", "env", "q1", "OPENAI_API_KEY"]),
      ).rejects.toThrow("exit");
      expect(fetch).not.toHaveBeenCalled();
      expect(await readFile(target, "utf8")).toBe("other-value");
    },
  );
});
