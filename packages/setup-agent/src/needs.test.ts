import { describe, expect, it } from "vitest";
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
  plans: [{ revision: 3, markdown: "x", status: "proposed", submittedAt: 1 }],
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

/** Records the commands an answer sends. */
const clientFor = (state: Checkout.State) => {
  const calls: [string, unknown][] = [];
  const commands = new Proxy(
    {},
    {
      get: (_, name: string) => async (params: unknown) =>
        void calls.push([name, params]),
    },
  ) as Parameters<typeof answerNeed>[0]["commands"];
  return { client: { state, commands }, calls };
};

describe("pendingNeeds", () => {
  it("lists open inputs, a proposed plan and a proposal to close, until a follow-up or the end", () => {
    const state = stateWith({}, { status: "answered" });
    state.completion = { proposedAt: 9 };
    expect(pendingNeeds(state).map((need) => need.id)).toEqual([
      "q1",
      "plan",
      "finish",
    ]);
    state.log.push({
      id: "l1",
      role: "user",
      phase: "installing",
      at: 10,
      text: "more",
      acknowledgedAt: 11,
    });
    expect(pendingNeeds(state).map((need) => need.id)).toEqual(["q1", "plan"]);
    state.status = "done";
    expect(pendingNeeds(state)).toEqual([]);
  });
});

describe("terminalQuestion", () => {
  it("names variants as the ids the answer takes, and never asks for an API key", () => {
    const [framework, model] = pendingNeeds(
      stateWith(
        presetInput("framework") as Checkout.Input,
        presetInput("llm-provider") as Checkout.Input,
      ),
    ).map((need) => terminalQuestion(need));
    expect(framework!.options?.map((option) => option.id)).toEqual([
      "ai-sdk:typescript",
      "mastra:typescript",
      "langgraph:python",
      "langgraph:typescript",
    ]);
    expect(formatTerminalQuestion(framework!)).toMatch(
      /^Which agent framework runs your backend\? Options: ai-sdk:typescript \(Vercel AI SDK \(TypeScript\): Shortest path/,
    );
    expect(model!.question).toContain("The API key is not typed here");
    expect(model!.answerFormat).toBe(
      "<provider>:<model>, such as openai:gpt-5",
    );
  });
});

describe("answerNeed", () => {
  it("sends each kind of answer in the shape the setup takes", async () => {
    const { client, calls } = clientFor(
      stateWith(
        {},
        {
          kind: "choice",
          multiple: true,
          options: [
            { id: "slack", label: "Slack" },
            { id: "email", label: "Email" },
          ],
        },
        presetInput("llm-provider") as Checkout.Input,
        { kind: "product", product: "cloud" },
        { optional: true },
      ),
    );
    await answerNeed(client, "q1", "apps/web", { note: " from chat " });
    await answerNeed(client, "q2", "slack, email");
    await answerNeed(
      client,
      "q3",
      '{"provider":"anthropic","model":"claude-sonnet-5","apiKey":"sk-x"}',
    );
    await answerNeed(client, "q4", "add");
    await answerNeed(client, "q5", undefined, { dismiss: true });
    await answerNeed(client, "plan", "revise", { feedback: "use pnpm" });
    await answerNeed(client, "plan", "approve");
    expect(calls).toEqual([
      [
        "checkout/answer",
        { inputId: "q1", answer: "apps/web", note: "from chat" },
      ],
      ["checkout/answer", { inputId: "q2", answer: '["slack","email"]' }],
      [
        "checkout/answer",
        {
          inputId: "q3",
          answer: JSON.stringify({
            provider: "anthropic",
            model: "claude-sonnet-5",
          }),
        },
      ],
      [
        "checkout/add-product",
        { inputId: "q4", product: { slug: "cloud", name: "cloud" } },
      ],
      ["checkout/dismiss", { inputId: "q5" }],
      [
        "checkout/plan",
        { id: "s1", revision: 3, decision: "revise", feedback: "use pnpm" },
      ],
      ["checkout/plan", { id: "s1", revision: 3, decision: "approve" }],
    ]);
  });

  it("refuses an answer the setup would before sending it, and closes only a current proposal", async () => {
    const { client, calls } = clientFor(
      stateWith(
        presetInput("framework") as Checkout.Input,
        presetInput("llm-provider") as Checkout.Input,
        {
          status: "answered",
        },
      ),
    );
    await expect(answerNeed(client, "q1", "langgraph")).rejects.toThrow(
      "langgraph:python",
    );
    await expect(answerNeed(client, "q2", "nope:x")).rejects.toThrow(
      "providers",
    );
    await expect(answerNeed(client, "q3", "x")).rejects.toThrow(
      "already answered",
    );
    await expect(answerNeed(client, "plan", "revise")).rejects.toThrow(
      "--feedback",
    );
    await expect(answerNeed(client, "finish", "close")).rejects.toThrow(
      "no proposal to close",
    );
    client.state.completion = { proposedAt: 9 };
    await answerNeed(client, "finish", "close");
    expect(calls).toEqual([["checkout/finish", undefined]]);
    await expect(
      answerNeed(client, "q1", undefined, { dismiss: true }),
    ).rejects.toThrow("required");
  });
});
