import { describe, expect, it, vi } from "vitest";
import {
  answerNeed,
  formatTerminalQuestion,
  pendingNeeds,
  terminalQuestion,
} from "./needs";
import { presetInput } from "./presets";
import { initialCheckoutState } from "./protocol";
import type { Checkout } from "./protocol";

const stateWith = (...inputs: Partial<Checkout.Input>[]): Checkout.State => ({
  ...initialCheckoutState(),
  id: "s1",
  createdAt: 1,
  status: "planning",
  inputs: inputs.map((input, index) => ({
    id: `q${index + 1}`,
    phase: "planning",
    kind: "text",
    prompt: "Where?",
    optional: false,
    status: "open",
    createdAt: index + 1,
    ...input,
  })),
});

const clientFor = (state: Checkout.State) => {
  const calls: [string, unknown][] = [];
  const commands = new Proxy(
    {},
    {
      get: (_, name: string) =>
        vi.fn(async (params: unknown) => {
          calls.push([name, params]);
        }),
    },
  ) as Parameters<typeof answerNeed>[0]["commands"];
  return { client: { state, commands }, calls };
};

const framework = presetInput("framework") as Checkout.Input;

describe("pendingNeeds", () => {
  it("lists open inputs, a proposed plan and a proposal to close, and nothing once closed", () => {
    const state = stateWith({}, { status: "answered" });
    state.plans.push({
      revision: 2,
      markdown: "x",
      status: "proposed",
      submittedAt: 1,
    });
    state.completion = { proposedAt: 9 };
    expect(pendingNeeds(state).map((need) => need.id)).toEqual([
      "q1",
      "plan",
      "finish",
    ]);
    state.status = "done";
    expect(pendingNeeds(state)).toEqual([]);
  });

  it("drops the proposal to close while a follow-up from the user waits", () => {
    const state = stateWith();
    state.completion = { proposedAt: 9 };
    state.log.push({
      id: "l1",
      role: "user",
      phase: "installing",
      at: 10,
      text: "one more thing",
    });
    expect(pendingNeeds(state)).toEqual([]);
  });
});

describe("terminalQuestion", () => {
  it("spells out options with variants as the ids the answer takes", () => {
    const state = stateWith({ ...framework, kind: "choice" });
    const question = terminalQuestion(pendingNeeds(state)[0]!);
    expect(question.options?.map((option) => option.id)).toEqual([
      "ai-sdk:typescript",
      "mastra:typescript",
      "langgraph:python",
      "langgraph:typescript",
    ]);
    expect(formatTerminalQuestion(question)).toMatch(
      /^Which agent framework runs your backend\? Options: ai-sdk:typescript \(Vercel AI SDK \(TypeScript\): Shortest path/,
    );
  });

  it("never asks for an API key in the terminal", () => {
    const state = stateWith(presetInput("llm-provider") as Checkout.Input);
    const question = terminalQuestion(pendingNeeds(state)[0]!);
    expect(question.question).toContain("The API key is not typed here");
    expect(question.answerFormat).toBe(
      "<provider>:<model>, such as openai:gpt-5",
    );
  });
});

describe("answerNeed", () => {
  it("answers a text input with the user's words and a note", async () => {
    const { client, calls } = clientFor(stateWith({}));
    await expect(
      answerNeed(client, "q1", "apps/web", { note: " from chat " }),
    ).resolves.toEqual({ ok: true, id: "q1", status: "answered" });
    expect(calls).toEqual([
      [
        "checkout/answer",
        { inputId: "q1", answer: "apps/web", note: "from chat" },
      ],
    ]);
  });

  it("turns a comma list into the JSON array a multiple choice takes", async () => {
    const { client, calls } = clientFor(
      stateWith({
        kind: "choice",
        multiple: true,
        options: [
          { id: "slack", label: "Slack" },
          { id: "email", label: "Email" },
        ],
      }),
    );
    await answerNeed(client, "q1", "slack, email");
    expect(calls[0]).toEqual([
      "checkout/answer",
      { inputId: "q1", answer: '["slack","email"]' },
    ]);
  });

  it("refuses an option named without its variant before sending it", async () => {
    const { client, calls } = clientFor(stateWith(framework));
    await expect(answerNeed(client, "q1", "langgraph")).rejects.toThrow(
      "langgraph:python",
    );
    expect(calls).toEqual([]);
  });

  it("answers a model input as JSON from provider:model", async () => {
    const { client, calls } = clientFor(
      stateWith(presetInput("llm-provider") as Checkout.Input),
    );
    await answerNeed(client, "q1", "anthropic:claude-sonnet-5");
    expect(calls[0]).toEqual([
      "checkout/answer",
      {
        inputId: "q1",
        answer: JSON.stringify({
          provider: "anthropic",
          model: "claude-sonnet-5",
        }),
      },
    ]);
    await expect(answerNeed(client, "q1", "nope:x")).rejects.toThrow(
      "providers",
    );
  });

  it("adds or declines a proposed product and dismisses an optional input", async () => {
    const { client, calls } = clientFor(
      stateWith({ kind: "product", product: "cloud" }, { optional: true }),
    );
    await answerNeed(client, "q1", "add");
    await answerNeed(client, "q2", undefined, { dismiss: true });
    expect(calls).toEqual([
      [
        "checkout/add-product",
        { inputId: "q1", product: { slug: "cloud", name: "cloud" } },
      ],
      ["checkout/dismiss", { inputId: "q2" }],
    ]);
  });

  it("approves or revises the current plan revision and closes a proposed finish", async () => {
    const state = stateWith();
    state.plans.push({
      revision: 3,
      markdown: "x",
      status: "proposed",
      submittedAt: 1,
    });
    const { client, calls } = clientFor(state);
    await answerNeed(client, "plan", "approve");
    await answerNeed(client, "plan", "revise", { feedback: "use pnpm" });
    await expect(answerNeed(client, "plan", "revise")).rejects.toThrow(
      "--feedback",
    );
    await answerNeed(client, "finish", "close");
    expect(calls).toEqual([
      ["checkout/plan", { id: "s1", revision: 3, decision: "approve" }],
      [
        "checkout/plan",
        { id: "s1", revision: 3, decision: "revise", feedback: "use pnpm" },
      ],
      ["checkout/finish", undefined],
    ]);
  });

  it("refuses an input that is already answered", async () => {
    const { client } = clientFor(stateWith({ status: "answered" }));
    await expect(answerNeed(client, "q1", "x")).rejects.toThrow(
      "already answered",
    );
  });
});
