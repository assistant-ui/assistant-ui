import { describe, expect, it } from "vitest";
import { setupMessages } from "./setup-messages";
import {
  initialCheckoutState,
  type Checkout,
} from "../../../lib/checkout/protocol";

describe("setupMessages", () => {
  it("starts with the user's complete order and setup instructions", () => {
    const state = {
      ...initialCheckoutState(),
      createdAt: 1,
      products: [
        { slug: "assistant-ui", name: "assistant-ui" },
        { slug: "cloud", name: "Cloud" },
      ],
      instructions: "Use the offline gateway.",
    };
    expect(setupMessages(state)[0]).toMatchObject({
      id: "order",
      stage: "order",
      role: "user",
      products: state.products,
      text: state.instructions,
    });
  });

  it("keeps a question and its reply in the same stage even after building begins", () => {
    const state: Checkout.State = {
      ...initialCheckoutState(),
      status: "installing",
      inputs: [
        {
          id: "q1",
          phase: "planning",
          kind: "text",
          prompt: "Which route?",
          optional: false,
          status: "answered",
          createdAt: 1,
          answeredAt: 4,
          answer: "/chat",
        },
      ],
      log: [
        {
          id: "l1",
          phase: "installing",
          role: "agent",
          at: 3,
          text: "Building",
        },
        {
          id: "l2",
          phase: "installing",
          role: "user",
          at: 5,
          text: "Keep our theme",
        },
      ],
    };
    const messages = setupMessages(state);
    expect(
      messages
        .filter((message) => message.stage === "plan")
        .map((message) => message.role),
    ).toEqual(["agent", "user"]);
    expect(
      messages
        .filter((message) => message.stage === "build")
        .map((message) => message.role),
    ).toEqual(["agent", "user"]);
  });

  it("keeps questions, agent notes, and answers in chronological order with reply references", () => {
    const state: Checkout.State = {
      ...initialCheckoutState(),
      log: [
        {
          id: "l1",
          at: 2,
          role: "agent",
          phase: "planning",
          text: "I found an existing route.",
        },
      ],
      inputs: [
        {
          id: "q1",
          kind: "choice",
          phase: "planning",
          prompt: "Which framework?",
          options: [
            {
              id: "next",
              label: "Next.js",
              variants: [{ id: "ts", label: "TypeScript" }],
            },
          ],
          optional: false,
          status: "answered",
          answer: "next:ts",
          note: "Keep the theme",
          createdAt: 1,
          answeredAt: 3,
        },
      ],
    };
    const messages = setupMessages(state);
    expect(messages.map((message) => message.id)).toEqual([
      "q1-question",
      "l1",
      "q1-answer",
    ]);
    expect(messages[0]?.question?.id).toBe("q1");
    expect(messages[2]).toMatchObject({
      role: "user",
      text: "Next.js · TypeScript\n\nKeep the theme",
      replyTo: { inputId: "q1", prompt: "Which framework?" },
    });
  });

  it("renders model answers as readable configuration", () => {
    const state: Checkout.State = {
      ...initialCheckoutState(),
      inputs: [
        {
          id: "q1",
          kind: "model",
          phase: "planning",
          prompt: "Which model?",
          optional: false,
          status: "answered",
          createdAt: 1,
          answeredAt: 2,
          options: [{ id: "openai", label: "OpenAI" }],
          answer: JSON.stringify({
            provider: "openai",
            model: "test-model",
            reasoningEffort: "high",
          }),
        },
      ],
    };
    expect(setupMessages(state)[1]?.text).toBe(
      "OpenAI · test-model · high reasoning",
    );
  });
});
