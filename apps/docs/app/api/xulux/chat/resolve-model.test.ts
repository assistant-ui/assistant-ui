import { DEFAULT_MODEL_ID } from "@/constants/model";
import { resolveXuluxModel } from "./resolve-model";

describe("resolveXuluxModel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves the default model without warning when no config is sent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { model, providerOptions } = resolveXuluxModel(undefined);

    expect(model.modelId).toBe(DEFAULT_MODEL_ID);
    expect(providerOptions).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns and falls back to the default for an unknown model id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { model } = resolveXuluxModel({ modelName: "gpt-4.1-mini" });

    expect(model.modelId).toBe(DEFAULT_MODEL_ID);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("routes gpt-5.6-luna with a reasoning effort through the responses API", () => {
    const { model, providerOptions } = resolveXuluxModel({
      modelName: "gpt-5.6-luna",
      reasoningEffort: "high",
    });

    expect(model.modelId).toBe("gpt-5.6-luna");
    expect(providerOptions).toEqual({ openai: { reasoningEffort: "high" } });
  });

  it("ignores an invalid reasoning effort", () => {
    const { providerOptions } = resolveXuluxModel({
      modelName: "gpt-5.6-luna",
      reasoningEffort: "ultra",
    });

    expect(providerOptions).toBeUndefined();
  });
});
