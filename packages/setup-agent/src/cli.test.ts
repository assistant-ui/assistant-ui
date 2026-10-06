import { initialCheckoutState, type Checkout } from "./protocol";
import { describe, expect, it, vi } from "vitest";
import {
  HELP,
  INSTRUCTIONS,
  askSeed,
  diffEvents,
  detectAgentKind,
  isDirectInvocation,
  upsertEnvLine,
  waitForStart,
} from "./cli";

describe("the agent's briefing", () => {
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
