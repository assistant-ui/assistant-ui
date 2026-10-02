import { describe, expect, it } from "vitest";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import { StatewireSendError } from "statewire";
import { CheckoutHost } from "./host";
import { presetInput } from "./presets";
import {
  classifyChoiceAnswer,
  currentPlan,
  initialCheckoutState,
  isAgentPresent,
  openInputs,
  parseModelAnswer,
  planNeedsReview,
  stepProgress,
} from "./protocol";

const mount = (restored?: unknown) => {
  const root = createTapRoot(() => useResource(CheckoutHost(restored)));
  flushTapSync(() => {});
  return root.getValue();
};

const seed = {
  id: "c1",
  products: [
    {
      slug: "assistant-ui",
      name: "assistant-ui",
      guide: "https://example.test/install.md?items=assistant-ui",
    },
  ],
};

const reason = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(StatewireSendError);
    const { failure } = error as StatewireSendError;
    if (failure.fate !== "rejected") throw new Error(failure.fate);
    return failure.payload;
  }
  throw new Error("expected a rejection");
};

const approvedHost = async () => {
  const host = mount();
  await host.commands["checkout/create"](seed);
  await host.commands["agent/hello"]({ cwd: "/app" });
  await host.commands["checkout/begin-plan"]();
  await host.commands["agent/plan"]({ markdown: "## Steps\n1. Install" });
  await host.commands["checkout/plan"]({ decision: "approve" });
  return host;
};

describe("CheckoutHost", () => {
  it("creates the products once, with no steps or questions", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    expect(host.state.status).toBe("waiting");
    expect(host.state.products).toEqual(seed.products);
    expect(host.state.steps).toEqual([]);
    expect(openInputs(host.state)).toHaveLength(0);
    expect(await reason(host.commands["checkout/create"](seed))).toEqual({
      reason: "already-created",
    });
  });

  it("refuses agent commands before creation and after close", async () => {
    const host = mount();
    expect(await reason(host.commands["agent/log"]({ text: "x" }))).toEqual({
      reason: "not-created",
    });
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    await host.commands["agent/ask"]({ prompt: "Where?" });
    await host.commands["checkout/cancel"]();
    expect(await reason(host.commands["agent/log"]({ text: "x" }))).toEqual({
      reason: "closed",
    });
    expect(openInputs(host.state)).toHaveLength(0);
  });

  it("keeps a connected agent waiting until the browser begins planning", async () => {
    const host = mount();
    expect(await reason(host.commands["checkout/begin-plan"]())).toEqual({
      reason: "not-created",
    });
    await host.commands["checkout/create"](seed);
    await host.commands["agent/hello"]({ cwd: "/app" });
    await host.commands["agent/heartbeat"]();
    await host.commands["agent/log"]({ text: "Ready when you are" });
    expect(host.state.status).toBe("waiting");
    expect(host.state.agent.cwd).toBe("/app");
    expect(isAgentPresent(host.state)).toBe(true);
    expect(
      await reason(host.commands["agent/ask"]({ prompt: "Where?" })),
    ).toEqual({ reason: "planning-not-started" });
    expect(
      await reason(host.commands["agent/plan"]({ markdown: "Install" })),
    ).toEqual({ reason: "planning-not-started" });
    const restored = mount(host.snapshot());
    expect(restored.state.status).toBe("waiting");
    await restored.commands["checkout/begin-plan"]();
    await restored.commands["checkout/begin-plan"]();
    expect(restored.state.status).toBe("planning");
    await restored.commands["agent/plan"]({ markdown: "Install" });
    await restored.commands["checkout/plan"]({ decision: "approve" });
    await restored.commands["checkout/begin-plan"]();
    expect(restored.state.status).toBe("installing");
    await restored.commands["checkout/cancel"]();
    expect(await reason(restored.commands["checkout/begin-plan"]())).toEqual({
      reason: "closed",
    });
  });

  it("replaces a closed setup on the next create and keeps the agent while it is present", async () => {
    const host = mount();
    await host.commands["agent/hello"]({ cwd: "/app", kind: "claude" });
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    await host.commands["agent/plan"]({ markdown: "## Steps\n1. Install" });
    await host.commands["checkout/plan"]({ decision: "approve" });
    await host.commands["agent/done"]({ summary: "Installed" });
    await host.commands["checkout/finish"]();
    await host.commands["agent/heartbeat"]();
    expect(await reason(host.commands["checkout/create"](seed))).toEqual({
      reason: "already-created",
    });
    const next = {
      id: "c2",
      products: [{ slug: "cloud", name: "Cloud" }],
      instructions: "Use pnpm",
    };
    await host.commands["checkout/create"](next);
    expect(host.state.id).toBe("c2");
    expect(host.state.status).toBe("waiting");
    expect(host.state.completion).toBeUndefined();
    expect(host.state.products).toEqual(next.products);
    expect(host.state.instructions).toBe("Use pnpm");
    expect(host.state.plans).toEqual([]);
    expect(host.state.log).toEqual([]);
    expect(host.state.agent.cwd).toBe("/app");
    expect(host.state.agent.kind).toBe("claude");
    expect(isAgentPresent(host.state)).toBe(true);
    await host.commands["agent/bye"]();
    await host.commands["checkout/create"]({ ...next, id: "c3" });
    expect(host.state.agent).toEqual(initialCheckoutState().agent);
  });

  it("restores a snapshot and drops one from an older version", async () => {
    const first = mount();
    await first.commands["checkout/create"](seed);
    const restored = mount(first.snapshot());
    expect(restored.state.products).toHaveLength(1);
    expect(restored.state.createdAt).toBe(first.state.createdAt);
    const stale = mount({ ...(first.snapshot() as object), version: 1 });
    expect(stale.state.createdAt).toBeNull();
  });
});

describe("plans", () => {
  it("refuses steps until the user approves a plan", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    await host.commands["agent/hello"]({});
    expect(
      await reason(host.commands["agent/add-step"]({ title: "Install" })),
    ).toEqual({ reason: "plan-required" });
    expect(
      await reason(host.commands["checkout/plan"]({ decision: "approve" })),
    ).toEqual({ reason: "no-plan" });
    expect(
      await reason(host.commands["agent/plan"]({ markdown: "  " })),
    ).toEqual({ reason: "empty-plan" });

    expect(await host.commands["agent/plan"]({ markdown: "## Steps" })).toEqual(
      { revision: 1 },
    );
    expect(planNeedsReview(host.state)).toBe(true);
    expect(
      await reason(host.commands["agent/add-step"]({ title: "Install" })),
    ).toEqual({ reason: "plan-required" });

    await host.commands["checkout/plan"]({ decision: "approve" });
    expect(host.state.status).toBe("installing");
    expect(currentPlan(host.state)?.status).toBe("approved");
    expect(planNeedsReview(host.state)).toBe(false);
    expect(
      await reason(host.commands["checkout/plan"]({ decision: "approve" })),
    ).toEqual({ reason: "plan-decided" });
    expect(
      await reason(host.commands["agent/plan"]({ markdown: "again" })),
    ).toEqual({ reason: "plan-decided" });
  });

  it("keeps every revision and the feedback that asked for the next", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    await host.commands["agent/hello"]({});
    await host.commands["agent/plan"]({ markdown: "v1" });
    expect(
      await reason(
        host.commands["checkout/plan"]({ decision: "revise", feedback: " " }),
      ),
    ).toEqual({ reason: "feedback-required" });
    await host.commands["checkout/plan"]({
      decision: "revise",
      feedback: "Use pnpm",
    });
    expect(host.state.status).toBe("planning");
    expect(currentPlan(host.state)).toMatchObject({
      revision: 1,
      status: "changes-requested",
      feedback: "Use pnpm",
    });
    expect(await host.commands["agent/plan"]({ markdown: "v2" })).toEqual({
      revision: 2,
    });
    expect(host.state.plans.map((plan) => plan.status)).toEqual([
      "changes-requested",
      "proposed",
    ]);
  });
});

describe("steps", () => {
  it("records completed tasks once in chat and preserves them when restored", async () => {
    const host = await approvedHost();
    const { stepId } = await host.commands["agent/add-step"]({
      title: "Install packages",
      active: true,
    });
    await host.commands["agent/log"]({ text: "Installing" });
    await host.commands["agent/step"]({
      stepId,
      status: "done",
      note: "Packages installed.",
    });
    await host.commands["agent/step"]({ stepId, status: "done" });
    await host.commands["agent/log"]({ text: "Checking the route" });
    expect(host.state.log.map((entry) => entry.text)).toEqual([
      "Installing",
      "Completed: Install packages\n\nPackages installed.",
      "Checking the route",
    ]);
    expect(host.state.log[1]).toMatchObject({
      role: "agent",
      stepId,
      at: expect.any(Number),
    });
    expect(mount(host.snapshot()).state.log).toEqual(host.state.log);
  });

  it("reports skipped tasks and tasks finished by done without duplicating earlier completions", async () => {
    const host = await approvedHost();
    const first = await host.commands["agent/add-step"]({
      title: "Install packages",
    });
    await host.commands["agent/step"]({
      stepId: first.stepId,
      status: "skipped",
      note: "Already installed.",
    });
    await host.commands["agent/add-step"]({
      title: "Wire the route",
      active: true,
    });
    await host.commands["agent/add-step"]({ title: "Check types" });
    await host.commands["agent/done"]();
    expect(host.state.log.map((entry) => entry.text)).toEqual([
      "Skipped: Install packages\n\nAlready installed.",
      "Completed: Wire the route",
      "Completed: Check types",
      "Everything is installed.",
    ]);
  });

  it("lets the agent declare, start and finish its own steps", async () => {
    const host = await approvedHost();
    const first = await host.commands["agent/add-step"]({
      title: "Install packages",
      detail: "pnpm add",
      product: "assistant-ui",
      active: true,
    });
    const second = await host.commands["agent/add-step"]({
      title: "Wire the route",
    });
    expect([first, second]).toEqual([{ stepId: "s1" }, { stepId: "s2" }]);
    expect(host.state.steps.map((step) => step.status)).toEqual([
      "active",
      "pending",
    ]);
    await host.commands["agent/log"]({ text: "Adding packages" });
    expect(host.state.log.at(-1)?.stepId).toBe("s1");
    await host.commands["agent/step"]({
      stepId: "s1",
      status: "done",
      note: "pnpm add ran",
    });
    expect(stepProgress(host.state)).toEqual({ done: 1, total: 2 });
    expect(
      await reason(
        host.commands["agent/step"]({ stepId: "nope", status: "done" }),
      ),
    ).toEqual({ reason: "unknown-step" });
    await host.commands["agent/ask"]({ prompt: "Port?", stepId: "s2" });
    expect(await reason(host.commands["checkout/finish"]())).toEqual({
      reason: "finish-not-proposed",
    });
    await host.commands["agent/done"]({ summary: " Installed the thread. " });
    expect(host.state.status).toBe("installing");
    expect(host.state.log.at(-1)?.text).toBe("Installed the thread.");
    const proposedAt = host.state.completion?.proposedAt;
    expect(proposedAt).toBeTypeOf("number");
    expect(host.state.steps.map((step) => step.status)).toEqual([
      "done",
      "done",
    ]);
    expect(openInputs(host.state)).toHaveLength(1);

    await host.commands["checkout/message"]({ text: "Add dark mode too" });
    expect(host.state.completion?.proposedAt).toBe(proposedAt);
    await host.commands["agent/add-step"]({ title: "Dark mode", active: true });
    await host.commands["agent/done"]();

    await host.commands["checkout/finish"]();
    expect(host.state.status).toBe("done");
    expect(host.state.log.at(-1)?.text).toBe("Setup complete.");
    expect(openInputs(host.state)).toHaveLength(0);
  });
});

describe("preview", () => {
  it("keeps a loopback dev server address on the proposal", async () => {
    const host = await approvedHost();
    await host.commands["agent/done"]({
      preview: " http://localhost:3000/chat ",
    });
    expect(host.state.completion?.preview).toBe("http://localhost:3000/chat");
    await host.commands["agent/done"]();
    expect(host.state.completion?.preview).toBeUndefined();
  });

  it.each([
    "https://example.com",
    "http://localhost.example.com:3000",
    "http://user:pass@localhost:3000",
    "javascript:alert(1)",
    "localhost:3000",
  ])("refuses %s as a preview", async (preview) => {
    const host = await approvedHost();
    expect(await reason(host.commands["agent/done"]({ preview }))).toEqual({
      reason: "invalid-preview",
    });
    expect(host.state.completion).toBeUndefined();
  });
});

describe("inputs", () => {
  it("adds a product the agent proposed once the user accepts", async () => {
    const host = mount();
    await host.commands["checkout/create"]({
      id: "c1",
      products: [{ slug: "attachments", name: "Attachments" }],
    });
    await host.commands["checkout/begin-plan"]();
    await host.commands["agent/hello"]({});
    expect(
      await reason(
        host.commands["agent/ask"]({ kind: "product", prompt: "Add it?" }),
      ),
    ).toEqual({ reason: "invalid-input" });
    expect(
      await reason(
        host.commands["agent/ask"]({
          kind: "product",
          prompt: "Add it?",
          product: "attachments",
        }),
      ),
    ).toEqual({ reason: "invalid-input" });
    const { inputId } = await host.commands["agent/ask"]({
      kind: "product",
      prompt: "assistant-ui is not installed yet. Add it?",
      product: "assistant-ui",
    });
    expect(
      await reason(host.commands["checkout/answer"]({ inputId, answer: "ok" })),
    ).toEqual({ reason: "invalid-answer" });
    expect(
      await reason(
        host.commands["checkout/add-product"]({
          inputId,
          product: { slug: "cloud", name: "Cloud" },
        }),
      ),
    ).toEqual({ reason: "invalid-answer" });
    await host.commands["checkout/add-product"]({
      inputId,
      product: { ...seed.products[0]! },
    });
    expect(host.state.products.map((product) => product.slug)).toEqual([
      "attachments",
      "assistant-ui",
    ]);
    expect(host.state.products[1]?.guide).toBe(seed.products[0]!.guide);
    expect(host.state.inputs[0]).toMatchObject({
      status: "answered",
      answer: "added",
    });
  });

  it("answers text with a note and closes the input", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    await host.commands["agent/hello"]({});
    const asked = await host.commands["agent/ask"]({ prompt: "Where?" });
    expect(
      await reason(
        host.commands["checkout/answer"]({
          inputId: asked.inputId,
          answer: " ",
        }),
      ),
    ).toEqual({ reason: "invalid-answer" });
    await host.commands["checkout/answer"]({
      inputId: asked.inputId,
      answer: "/app",
      note: " use the web folder ",
    });
    expect(host.state.inputs[0]).toMatchObject({
      status: "answered",
      answer: "/app",
      note: "use the web folder",
    });
    expect(
      await reason(
        host.commands["checkout/answer"]({
          inputId: asked.inputId,
          answer: "x",
        }),
      ),
    ).toEqual({ reason: "input-closed" });
    expect(
      await reason(host.commands["checkout/dismiss"]({ inputId: "nope" })),
    ).toEqual({ reason: "unknown-input" });
  });

  it("accepts an option, an option with its variant, or the user's own text", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    await host.commands["agent/hello"]({});
    await host.commands["agent/ask"](presetInput("framework"));
    const [framework] = host.state.inputs;
    expect(framework?.kind).toBe("choice");
    expect(framework?.preset).toBe("framework");
    expect(framework?.options?.map((option) => option.id)).toEqual([
      "ai-sdk",
      "mastra",
      "langgraph",
    ]);
    expect(classifyChoiceAnswer(framework!, "langgraph")).toBe("invalid");
    expect(classifyChoiceAnswer(framework!, "ai-sdk:x")).toBe("invalid");
    expect(classifyChoiceAnswer(framework!, "langgraph:python")).toBe("option");
    expect(classifyChoiceAnswer(framework!, "Hono with its own agent")).toBe(
      "custom",
    );
    expect(classifyChoiceAnswer(framework!, "")).toBe("invalid");

    expect(
      await reason(
        host.commands["checkout/answer"]({ inputId: "q1", answer: "ai-sdk" }),
      ),
    ).toEqual({ reason: "invalid-answer" });
    await host.commands["checkout/answer"]({
      inputId: "q1",
      answer: "Hono with its own agent",
    });
    expect(host.state.inputs[0]?.answer).toBe("Hono with its own agent");
  });

  it("accepts any number of options when the question allows several", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    const { inputId } = await host.commands["agent/ask"]({
      kind: "choice",
      prompt: "Which integrations?",
      options: [
        { id: "slack", label: "slack", icon: "message" },
        { id: "email", label: "email", icon: "mail" },
      ],
      multiple: true,
    });
    const [input] = host.state.inputs;
    expect(input?.multiple).toBe(true);
    expect(input?.options?.[0]?.icon).toBe("message");
    expect(classifyChoiceAnswer(input!, "slack")).toBe("invalid");
    expect(classifyChoiceAnswer(input!, "[]")).toBe("invalid");
    expect(classifyChoiceAnswer(input!, '["slack",""]')).toBe("invalid");
    expect(classifyChoiceAnswer(input!, '["slack","email"]')).toBe("option");
    expect(classifyChoiceAnswer(input!, '["email","Discord"]')).toBe("custom");
    expect(
      await reason(
        host.commands["checkout/answer"]({ inputId, answer: "slack" }),
      ),
    ).toEqual({ reason: "invalid-answer" });
    await host.commands["checkout/answer"]({
      inputId,
      answer: '["slack","email"]',
    });
    expect(host.state.inputs[0]?.answer).toBe('["slack","email"]');

    expect(
      await reason(
        host.commands["agent/ask"]({
          kind: "choice",
          prompt: "Pick",
          options: [
            { id: "a", label: "A", variants: [{ id: "x", label: "X" }] },
          ],
          multiple: true,
        }),
      ),
    ).toEqual({ reason: "invalid-input" });
    expect(
      await reason(
        host.commands["agent/ask"]({ prompt: "Where?", multiple: true }),
      ),
    ).toEqual({ reason: "invalid-input" });
  });

  it("lists the projects the agent found ahead of a new project and its frameworks", async () => {
    const host = await approvedHost();
    const project = presetInput("project", {
      found: [{ id: "apps/web", description: "Next.js" }, { id: "apps/admin" }],
    });
    expect(project.options?.map((option) => option.id)).toEqual([
      "apps/web",
      "apps/admin",
      "new",
    ]);
    const { inputId } = await host.commands["agent/ask"](project);
    expect(
      await reason(
        host.commands["checkout/answer"]({ inputId, answer: "new" }),
      ),
    ).toEqual({ reason: "invalid-answer" });
    await host.commands["checkout/answer"]({ inputId, answer: "new:vite" });
    expect(host.state.inputs.at(-1)?.answer).toBe("new:vite");
    expect(() => presetInput("project", { found: [{ id: "new" }] })).toThrow();
    expect(() =>
      presetInput("project", { found: [{ id: "C:\\app" }] }),
    ).toThrow();
  });

  it("restricts and defaults a preset, and rejects a choice without options", async () => {
    const locked = presetInput("llm-provider", { only: ["anthropic"] });
    expect(locked.options?.map((option) => option.id)).toEqual(["anthropic"]);
    expect(locked.default).toBeUndefined();
    expect(presetInput("llm-provider", { default: "groq" }).default).toBe(
      "groq",
    );
    expect(() => presetInput("framework", { only: ["nope"] })).toThrow();
    expect(() => presetInput("framework", { default: "nope" })).toThrow();

    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    expect(
      await reason(
        host.commands["agent/ask"]({
          kind: "choice",
          prompt: "Pick",
          options: [],
        }),
      ),
    ).toEqual({ reason: "invalid-input" });
    expect(
      await reason(
        host.commands["agent/ask"]({
          kind: "choice",
          prompt: "Pick",
          options: [{ id: "a", label: "A" }],
          default: "b",
        }),
      ),
    ).toEqual({ reason: "invalid-input" });
    expect(
      await reason(
        host.commands["agent/ask"]({ prompt: "Pick", stepId: "nope" }),
      ),
    ).toEqual({ reason: "unknown-step" });
  });
});

describe("model inputs", () => {
  const answer = { provider: "openai", model: "gpt-test" };

  it("parses a model answer and rejects malformed ones", () => {
    expect(parseModelAnswer(JSON.stringify(answer))).toEqual(answer);
    expect(
      parseModelAnswer(JSON.stringify({ ...answer, reasoningEffort: "high" })),
    ).toEqual({ ...answer, reasoningEffort: "high" });
    expect(parseModelAnswer("openai")).toBeUndefined();
    expect(parseModelAnswer(JSON.stringify({ ...answer, model: "" }))).toBe(
      undefined,
    );
    expect(
      parseModelAnswer(JSON.stringify({ ...answer, reasoningEffort: "max" })),
    ).toBeUndefined();
  });

  it("asks with the llm-provider preset and only accepts a JSON answer for a listed provider", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    const asked = await host.commands["agent/ask"](presetInput("llm-provider"));
    const input = host.state.inputs.find((entry) => entry.id === asked.inputId);
    expect(input?.kind).toBe("model");
    expect(input?.default).toBe("openai");
    expect(input?.options?.map((option) => option.id)).toContain("openrouter");

    expect(
      await reason(
        host.commands["checkout/answer"]({
          inputId: asked.inputId,
          answer: "openai",
        }),
      ),
    ).toEqual({ reason: "invalid-answer" });
    expect(
      await reason(
        host.commands["checkout/answer"]({
          inputId: asked.inputId,
          answer: JSON.stringify({ ...answer, provider: "nope" }),
        }),
      ),
    ).toEqual({ reason: "invalid-answer" });
    await host.commands["checkout/answer"]({
      inputId: asked.inputId,
      answer: JSON.stringify(answer),
    });
    expect(parseModelAnswer(input?.answer ?? "")).toEqual(answer);

    expect(
      await reason(
        host.commands["agent/ask"]({ kind: "model", prompt: "Model?" }),
      ),
    ).toEqual({ reason: "invalid-input" });
  });
});

describe("agent identity", () => {
  it("records the intro and the agent kind without marking the agent present", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["agent/intro"]({ kind: "claude" });
    expect(host.state.status).toBe("waiting");
    expect(host.state.agent.lastSeenAt).toBeNull();
    expect(host.state.agent.kind).toBe("claude");
    const introducedAt = host.state.agent.introducedAt;
    expect(introducedAt).not.toBeNull();
    await host.commands["agent/intro"]({});
    expect(host.state.agent.introducedAt).toBe(introducedAt);
    await host.commands["agent/hello"]({ cwd: "/app", kind: "codex" });
    expect(host.state.agent.kind).toBe("codex");
    expect(host.state.status).toBe("waiting");
  });

  it("drops presence the moment the agent says bye", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["agent/hello"]({});
    expect(isAgentPresent(host.state)).toBe(true);
    await host.commands["agent/bye"]();
    expect(host.state.agent.lastSeenAt).not.toBeNull();
    expect(isAgentPresent(host.state)).toBe(false);
    await host.commands["agent/heartbeat"]();
    expect(isAgentPresent(host.state)).toBe(true);
  });
});

describe("setup chat", () => {
  it("preserves order instructions and records the stage and substep for both speakers", async () => {
    const host = mount();
    await host.commands["checkout/create"]({
      ...seed,
      instructions: "  Use our offline gateway.  ",
    });
    expect(host.state.instructions).toBe("Use our offline gateway.");
    await host.commands["checkout/message"]({ text: "Keep our theme" });
    expect(host.state.log[0]?.phase).toBe("waiting");
    await host.commands["checkout/begin-plan"]();
    await host.commands["agent/log"]({ text: "Reading your project" });
    expect(host.state.log[1]?.phase).toBe("planning");
    await host.commands["agent/plan"]({ markdown: "Add chat" });
    await host.commands["checkout/plan"]({ decision: "approve" });
    const { stepId } = await host.commands["agent/add-step"]({
      title: "Add route",
      active: true,
    });
    await host.commands["agent/log"]({ text: "Adding the route" });
    await host.commands["checkout/message"]({ text: "Use /chat" });
    expect(host.state.log.slice(-2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "agent", phase: "installing", stepId }),
        expect.objectContaining({ role: "user", phase: "installing", stepId }),
      ]),
    );
    const { inputId } = await host.commands["agent/ask"]({
      prompt: "Which layout?",
    });
    expect(
      host.state.inputs.find((input) => input.id === inputId),
    ).toMatchObject({ phase: "installing", stepId });
    expect(mount(host.snapshot()).state.instructions).toBe(
      "Use our offline gateway.",
    );
  });

  it("stores user steering before connection and acknowledges it without resolving a question", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/message"]({
      text: "  Use the existing endpoint.  ",
    });
    expect(host.state.status).toBe("waiting");
    expect(host.state.log[0]).toMatchObject({
      id: "l1",
      role: "user",
      text: "Use the existing endpoint.",
    });
    await host.commands["checkout/begin-plan"]();
    const { inputId } = await host.commands["agent/ask"]({
      prompt: "Which project?",
    });
    await host.commands["agent/ack"]({ messageId: "l1" });
    expect(host.state.log[0]?.acknowledgedAt).toEqual(expect.any(Number));
    expect(
      host.state.inputs.find((input) => input.id === inputId)?.status,
    ).toBe("open");
    expect(mount(host.snapshot()).state.log).toEqual(host.state.log);
    await host.commands["agent/log"]({ text: "I will reuse it." });
    expect(host.state.log[1]?.role).toBe("agent");
  });

  it("rejects empty messages, unknown acknowledgments, and messages after cancellation", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    expect(
      await reason(host.commands["checkout/message"]({ text: " " })),
    ).toEqual({ reason: "empty-message" });
    expect(
      await reason(host.commands["agent/ack"]({ messageId: "missing" })),
    ).toEqual({ reason: "unknown-message" });
    await host.commands["checkout/cancel"]();
    expect(
      await reason(host.commands["checkout/message"]({ text: "hello" })),
    ).toEqual({ reason: "closed" });
  });
});

describe("entry-point questions", () => {
  const options = [
    {
      id: "ticket-sidebar",
      label: "Ticket sidebar",
      description: "Keep the support ticket visible while drafting a reply.",
      entryPoint: {
        formFactor: "sidebar" as const,
        placement: "Right side of the ticket detail page",
        trigger: "Draft reply button in the ticket toolbar",
        recommended: true,
      },
    },
    {
      id: "inbox-sidebar",
      label: "Inbox sidebar",
      description: "Draft replies from the selected ticket in the inbox.",
      entryPoint: {
        formFactor: "sidebar" as const,
        placement: "Right side of the inbox",
        trigger: "Assist button in the inbox header",
      },
    },
  ];

  it("persists agent-generated placements and answers by stable id across restore", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    const { inputId } = await host.commands["agent/ask"]({
      kind: "entry-point",
      prompt: "Where should support agents draft replies?",
      options,
      default: "ticket-sidebar",
    });
    expect(host.state.inputs[0]?.options).toEqual(options);
    for (const answer of [
      "sidebar",
      "ticket-sidebar:variant",
      '["ticket-sidebar"]',
      "",
    ]) {
      expect(
        await reason(host.commands["checkout/answer"]({ inputId, answer })),
      ).toEqual({ reason: "invalid-answer" });
    }
    await host.commands["checkout/answer"]({
      inputId,
      answer: "inbox-sidebar",
      note: "Keep the ticket list visible",
    });
    const restored = mount(host.snapshot());
    expect(restored.state.inputs[0]).toMatchObject({
      kind: "entry-point",
      options,
      status: "answered",
      answer: "inbox-sidebar",
      note: "Keep the ticket list visible",
    });
  });

  it("rejects invalid structured inputs before they enter persisted state", async () => {
    const host = mount();
    await host.commands["checkout/create"](seed);
    await host.commands["checkout/begin-plan"]();
    for (const invalid of [
      { options: [] },
      { options: [options[0]!, options[0]!] },
      { options, multiple: true as const },
      { options, default: "unknown" },
      { options: [{ ...options[0]!, description: "" }] },
      {
        options: [
          {
            ...options[0]!,
            entryPoint: { ...options[0]!.entryPoint, trigger: "" },
          },
        ],
      },
    ]) {
      expect(
        await reason(
          host.commands["agent/ask"]({
            kind: "entry-point",
            prompt: "Where?",
            ...invalid,
          }),
        ),
      ).toEqual({ reason: "invalid-input" });
    }
    expect(host.state.inputs).toEqual([]);
  });
});

describe("product discovery", () => {
  it("rejects an empty related-product identifier", async () => {
    const host = await approvedHost();
    expect(
      await reason(
        host.commands["agent/add-step"]({
          title: "Install integration",
          product: " ",
        }),
      ),
    ).toEqual({ reason: "invalid-input" });
    expect(host.state.steps).toEqual([]);
  });

  it("tracks relevant products outside the starting list without changing that list", async () => {
    const host = await approvedHost();
    const discovered = await host.commands["agent/add-step"]({
      title: "Install discovered integration",
      product: "discovered-integration",
    });
    expect(
      host.state.steps.find((step) => step.id === discovered.stepId),
    ).toMatchObject({
      product: "discovered-integration",
    });
    await host.commands["agent/step"]({
      stepId: discovered.stepId,
      status: "done",
    });
    const restored = mount(host.snapshot());
    expect(restored.state.steps[0]).toMatchObject({
      product: "discovered-integration",
      status: "done",
    });
    expect(restored.state.products).toEqual(seed.products);
  });
});
