import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  chat: vi.fn((id: string) => ({ api: "chat", id })),
  responses: vi.fn((id: string) => ({ api: "responses", id })),
}));

vi.mock("@ai-sdk/openai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ai-sdk/openai")>()),
  createOpenAI: () => ({ chat: mocks.chat, responses: mocks.responses }),
}));

import { DEFAULT_MODEL_ID } from "../model";
import { resolveChatModel } from "./provider";

describe("resolveChatModel", () => {
  it("routes the default reasoning model through the Responses API at low effort", () => {
    expect(resolveChatModel(undefined)).toEqual({
      model: { api: "responses", id: DEFAULT_MODEL_ID },
      providerOptions: {
        openai: { reasoningEffort: "low", reasoningSummary: "auto" },
      },
      reasoning: true,
    });
  });

  it("passes a known reasoning effort through", () => {
    expect(
      resolveChatModel({ modelName: DEFAULT_MODEL_ID, reasoningEffort: "high" })
        .providerOptions,
    ).toEqual({
      openai: { reasoningEffort: "high", reasoningSummary: "auto" },
    });
  });

  it("falls back to low effort for an unknown value", () => {
    expect(
      resolveChatModel({ reasoningEffort: "extreme" }).providerOptions,
    ).toEqual({ openai: { reasoningEffort: "low", reasoningSummary: "auto" } });
  });

  it("keeps models without reasoning on Chat Completions", () => {
    expect(
      resolveChatModel({
        modelName: "grok/grok-4-1-fast",
        reasoningEffort: "high",
      }),
    ).toEqual({
      model: { api: "chat", id: "grok/grok-4-1-fast" },
      providerOptions: undefined,
      reasoning: false,
    });
  });

  it("ignores a model name that is not a string", () => {
    expect(resolveChatModel({ modelName: 42 }).model).toEqual({
      api: "responses",
      id: DEFAULT_MODEL_ID,
    });
  });
});
