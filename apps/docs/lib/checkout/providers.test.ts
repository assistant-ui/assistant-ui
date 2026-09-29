import { describe, expect, it, vi } from "vitest";
import {
  getModelProvider,
  MODEL_PROVIDERS,
  testProviderKey,
  tidyModels,
} from "./providers";
import { INPUT_PRESETS } from "./presets";

describe("model providers", () => {
  it("covers every provider the llm-provider preset offers", () => {
    for (const option of INPUT_PRESETS["llm-provider"].options) {
      const provider = MODEL_PROVIDERS[option.id];
      expect(provider, option.id).toBeDefined();
      expect(provider?.envKey).toBe(option.description);
    }
  });

  it.each(["constructor", "toString", "__proto__"])(
    "does not resolve inherited provider id %s",
    (id) => {
      expect(getModelProvider(id)).toBeUndefined();
    },
  );

  it("keeps chat models, drops the rest, and sorts newest names first", () => {
    expect(
      tidyModels([
        "gpt-4o",
        "text-embedding-3-large",
        "gpt-5",
        "whisper-1",
        "gpt-5",
        "tts-1",
      ]),
    ).toEqual(["gpt-5", "gpt-4o"]);
  });

  it("reads OpenAI-style, Anthropic and Gemini model lists", () => {
    expect(
      MODEL_PROVIDERS["openai"]!.parseModels({
        data: [{ id: "gpt-5" }, { id: "dall-e-3" }],
      }),
    ).toEqual(["gpt-5"]);
    expect(
      MODEL_PROVIDERS["anthropic"]!.parseModels({
        data: [{ id: "claude-x" }],
      }),
    ).toEqual(["claude-x"]);
    expect(
      MODEL_PROVIDERS["google"]!.parseModels({
        models: [
          {
            name: "models/gemini-pro",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/gemini-embedding",
            supportedGenerationMethods: ["embedContent"],
          },
        ],
      }),
    ).toEqual(["gemini-pro"]);
    expect(MODEL_PROVIDERS["openai"]!.parseModels(null)).toEqual([]);
  });

  it("maps the response into a key verdict", async () => {
    const provider = {
      ...MODEL_PROVIDERS["openai"]!,
      listModels: vi.fn(),
    };
    provider.listModels.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "gpt-5" }] }), {
        status: 200,
      }),
    );
    expect(await testProviderKey(provider, "k")).toEqual({
      status: "ok",
      models: ["gpt-5"],
    });
    provider.listModels.mockResolvedValueOnce(
      new Response("", { status: 401 }),
    );
    expect(await testProviderKey(provider, "k")).toEqual({
      status: "unauthorized",
    });
    provider.listModels.mockRejectedValueOnce(new TypeError("cors"));
    expect(await testProviderKey(provider, "k")).toEqual({
      status: "unreachable",
    });
  });
});
