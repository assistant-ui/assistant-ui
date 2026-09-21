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
  it("stays on Chat Completions when no effort is requested", () => {
    expect(resolveChatModel(undefined)).toEqual({
      model: { api: "chat", id: DEFAULT_MODEL_ID },
      providerOptions: undefined,
      reasoning: false,
    });
  });

  it("runs a reasoning model through the Responses API at the requested effort", () => {
    expect(
      resolveChatModel({
        modelName: DEFAULT_MODEL_ID,
        reasoningEffort: "medium",
      }),
    ).toEqual({
      model: { api: "responses", id: DEFAULT_MODEL_ID },
      providerOptions: {
        openai: {
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
        },
      },
      reasoning: true,
    });
  });

  it("clamps the effort a public caller can request to medium", () => {
    for (const effort of ["high", "xhigh"]) {
      expect(
        resolveChatModel({
          modelName: DEFAULT_MODEL_ID,
          reasoningEffort: effort,
        }).providerOptions?.openai.reasoningEffort,
      ).toBe("medium");
    }
  });

  it("ignores an unknown effort", () => {
    expect(resolveChatModel({ reasoningEffort: "extreme" }).reasoning).toBe(
      false,
    );
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

  it("falls back to the default model for a model name that is not a string", () => {
    expect(
      resolveChatModel({ modelName: 42, reasoningEffort: "low" }).model,
    ).toEqual({ api: "responses", id: DEFAULT_MODEL_ID });
  });

  it("falls back to the default model for an unknown model id", () => {
    expect(resolveChatModel({ modelName: "gpt-4.1-mini" }).model).toEqual({
      api: "chat",
      id: DEFAULT_MODEL_ID,
    });
  });

  it("treats a non-object config as empty", () => {
    expect(resolveChatModel("gpt-5.6-luna").reasoning).toBe(false);
  });
});
