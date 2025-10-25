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
      openai: { itemId: "rs" },
      custom: { safe: "keep" },
    });
  });

  it("merges reasoning by itemId and preserves metadata", () => {
    const { parts } = encode([
      reasoningPart("one", "rs_1", { "assistant-ui": { duration: 7 } }),
      reasoningPart("two", "rs_1"),
      { type: "step-start" } as any,
      { type: "text", text: "answer" } as any,
    ]);

    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({
      type: "reasoning",
      text: "one\n\ntwo",
      providerMetadata: {
        openai: { itemId: "rs_1" },
        "assistant-ui": { duration: 7 },
      },
    });
    expect(parts[1]).toEqual({ type: "text", text: "answer" });
  });
});
