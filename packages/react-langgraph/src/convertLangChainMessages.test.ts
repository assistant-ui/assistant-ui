import { describe, it, expect } from "vitest";
import { convertLangChainMessages } from "./convertLangChainMessages";

describe("convertLangChainMessages metadata", () => {
  it("passes additional_kwargs.metadata to system message", () => {
    const result = convertLangChainMessages({
      type: "system",
      id: "sys-1",
      content: "You are a helpful assistant.",
      additional_kwargs: {
        metadata: { speaker_name: "System" },
      },
    });

    expect(result).toMatchObject({
      role: "system",
      metadata: { custom: { speaker_name: "System" } },
    });
  });

  it("passes additional_kwargs.metadata to human message", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-1",
      content: "Hello!",
      additional_kwargs: {
        metadata: { speaker_name: "Presenter" },
      },
    });

    expect(result).toMatchObject({
      role: "user",
      metadata: { custom: { speaker_name: "Presenter" } },
    });
  });

  it("passes additional_kwargs.metadata to ai message", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "Hi there!",
      additional_kwargs: {
        metadata: { model: "gpt-4", speaker_name: "Assistant" },
      },
    });

    expect(result).toMatchObject({
      role: "assistant",
      metadata: { custom: { model: "gpt-4", speaker_name: "Assistant" } },
    });
  });

  it("defaults to empty metadata when additional_kwargs.metadata is absent", () => {
    const system = convertLangChainMessages({
      type: "system",
      id: "sys-1",
      content: "Hello",
    });
    expect(system).toMatchObject({
      metadata: { custom: {} },
    });

    const human = convertLangChainMessages({
      type: "human",
      id: "human-1",
      content: "Hello",
    });
    expect(human).toMatchObject({
      metadata: { custom: {} },
    });

    const ai = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "Hello",
    });
    expect(ai).toMatchObject({
      metadata: { custom: {} },
    });
  });

  it("defaults to empty metadata when additional_kwargs exists but has no metadata", () => {
    const ai = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "Hello",
      additional_kwargs: {},
    });
    expect(ai).toMatchObject({
      metadata: { custom: {} },
    });
  });
});
