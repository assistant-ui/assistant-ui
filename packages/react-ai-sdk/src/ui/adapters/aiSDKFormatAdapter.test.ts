import { describe, expect, it } from "vitest";
import { aiSDKV5FormatAdapter } from "./aiSDKFormatAdapter";
import type { UIMessage } from "ai";

const encode = (parts: UIMessage["parts"]) =>
  aiSDKV5FormatAdapter.encode({
    parentId: null,
    message: { id: "msg", role: "assistant", parts },
  });

const reasoningPart = (
  text: string,
  itemId?: string,
  extras: Record<string, any> = {},
) =>
  ({
    type: "reasoning",
    text,
    state: "done",
    providerMetadata: itemId ? { openai: { itemId }, ...extras } : extras,
  }) as any;

describe("aiSDKFormatAdapter", () => {
  it("strips encrypted content before cloud storage", () => {
    const { parts } = encode([
      {
        type: "reasoning",
        text: "thinking",
        state: "done",
        providerMetadata: {
          openai: { itemId: "rs", reasoningEncryptedContent: "..." },
          custom: { encryptedContent: "secret", safe: "keep" },
        },
      },
    ]);

    expect(parts[0].providerMetadata).toEqual({
      custom: { safe: "keep" },
    });
  });

  it("merges reasoning by itemId and strips provider itemId before storage", () => {
    const { parts } = encode([
      reasoningPart("one", "rs_1"),
      reasoningPart("two", "rs_1"),
      { type: "step-start" } as any,
      { type: "text", text: "answer" } as any,
    ]);

    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({
      type: "reasoning",
      text: "one\n\ntwo",
    });
    expect(parts[0].providerMetadata).toBeUndefined();
    expect(parts[1]).toEqual({ type: "text", text: "answer" });
  });

  it("stores and restores metadata naturally", () => {
    // Encode: UIMessage with metadata → storage format
    const uiMessage: any = {
      id: "msg-1",
      role: "assistant",
      parts: [
        reasoningPart("thinking...", "rs_1"),
        { type: "text", text: "answer" },
      ],
      metadata: {
        reasoningDurations: {
          rs_1: 23,
        },
      },
    };

    const encoded = aiSDKV5FormatAdapter.encode({
      parentId: null,
      message: uiMessage,
    });

    // Verify metadata is persisted in storage format
    expect(encoded.metadata).toEqual({
      reasoningDurations: {
        rs_1: 23,
      },
    });
    expect(encoded.parts[0].type).toBe("reasoning");
    expect(encoded.parts[0].providerMetadata).toBeUndefined();

    // Decode: storage format → UIMessage with metadata
    const decoded = aiSDKV5FormatAdapter.decode({
      id: "msg-1",
      parent_id: null,
      format: "ai-sdk/v5",
      content: encoded,
    });

    // Verify metadata is restored to UIMessage
    expect((decoded.message as any).metadata).toEqual({
      reasoningDurations: {
        rs_1: 23,
      },
    });
    expect(decoded.message.id).toBe("msg-1");
    expect(decoded.parentId).toBeNull();
  });

  it("removes itemId while retaining merged reasoning text", () => {
    const { parts } = encode([
      reasoningPart("para 1", "rs_abc"),
      reasoningPart("para 2", "rs_abc"),
    ]);

    expect(parts).toHaveLength(1); // Merged to 1 part
    expect(parts[0].text).toBe("para 1\n\npara 2"); // Text merged
    expect(parts[0].type).toBe("reasoning");
    expect(parts[0].providerMetadata).toBeUndefined();
  });

  it("preserves non-itemId provider metadata", () => {
    const { parts } = encode([
      {
        type: "reasoning",
        text: "thinking",
        state: "done",
        providerMetadata: {
          openai: {
            itemId: "rs_abc",
            custom: "keep this",
          },
        },
      } as any,
      reasoningPart("more", "rs_abc"),
    ]);

    expect(parts).toHaveLength(1);
    expect(parts[0].providerMetadata?.openai).toEqual({
      custom: "keep this",
    });
  });

  it("removes provider metadata when itemId was the only property", () => {
    const { parts } = encode([
      reasoningPart("one", "rs_abc"),
      reasoningPart("two", "rs_abc"),
    ]);

    expect(parts).toHaveLength(1);
    expect(parts[0].providerMetadata).toBeUndefined();
  });

  it("removes itemId for single reasoning parts as well", () => {
    const { parts } = encode([
      reasoningPart("solo thought", "rs_single"),
      { type: "text", text: "answer" } as any,
    ]);

    expect(parts).toHaveLength(2);
    expect(parts[0].type).toBe("reasoning");
    expect(parts[0].providerMetadata).toBeUndefined();
  });
});
