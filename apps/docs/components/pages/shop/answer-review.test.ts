import { describe, expect, it } from "vitest";
import { describeAnswer } from "./answer-review";
import type { Checkout } from "../../../lib/checkout/protocol";

const input = (overrides: Partial<Checkout.Input>): Checkout.Input => ({
  id: "q",
  prompt: "?",
  kind: "text",
  phase: "planning",
  optional: false,
  status: "answered",
  createdAt: 1,
  ...overrides,
});

describe("describeAnswer", () => {
  it("returns nothing for a skipped question", () => {
    expect(describeAnswer(input({ status: "dismissed" }))).toBeUndefined();
    expect(describeAnswer(input({ status: "open" }))).toBeUndefined();
  });

  it("words a choice by its labels and keeps the user's own text", () => {
    const options = [
      {
        id: "ai-sdk",
        label: "Vercel AI SDK",
        variants: [{ id: "typescript", label: "TypeScript" }],
      },
      { id: "mastra", label: "Mastra" },
    ];
    expect(
      describeAnswer(
        input({ kind: "choice", options, answer: "ai-sdk:typescript" }),
      ),
    ).toBe("Vercel AI SDK · TypeScript");
    expect(
      describeAnswer(input({ kind: "choice", options, answer: "mastra" })),
    ).toBe("Mastra");
    expect(
      describeAnswer(input({ kind: "choice", options, answer: "Hono" })),
    ).toBe("Hono");
  });

  it("names the provider and model of a model answer", () => {
    expect(
      describeAnswer(
        input({
          kind: "model",
          options: [{ id: "openai", label: "OpenAI" }],
          answer: JSON.stringify({
            provider: "openai",
            model: "gpt-5",
            reasoningEffort: "high",
          }),
        }),
      ),
    ).toBe("OpenAI · gpt-5 · high");
  });

  it("says what a product answer added", () => {
    expect(
      describeAnswer(input({ kind: "product", product: "assistant-ui" })),
    ).toBe("Added assistant-ui to this setup");
  });
});
