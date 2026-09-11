import { describe, expect, it } from "vitest";
import { extractAuiV0 } from "./AssistantCloudThreadHistoryAdapter";

const auiV0Message = (status: { type: string; reason?: string }) => ({
  role: "assistant",
  status,
  content: [
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "send_email",
      args: {},
      argsText: "{}",
    },
  ],
  metadata: { steps: [{ usage: { inputTokens: 1, outputTokens: 2 } }] },
});

describe("extractAuiV0", () => {
  it("returns null for a requires-action message so paused writes never report", () => {
    expect(
      extractAuiV0(
        auiV0Message({ type: "requires-action", reason: "tool-calls" }),
      ),
    ).toBeNull();
  });

  it("reports a terminal message once with its usage", () => {
    const result = extractAuiV0(auiV0Message({ type: "complete" }));
    expect(result?.status).toBe("completed");
    expect(result?.inputTokens).toBe(1);
    expect(result?.outputTokens).toBe(2);
  });

  it("sums step usage reported under the AI SDK v7 token details", () => {
    const result = extractAuiV0({
      ...auiV0Message({ type: "complete" }),
      metadata: {
        steps: [
          {
            usage: {
              inputTokens: 10,
              outputTokens: 4,
              inputTokenDetails: { cacheReadTokens: 6 },
              outputTokenDetails: { reasoningTokens: 1 },
            },
          },
          {
            usage: {
              inputTokens: 5,
              outputTokens: 2,
              inputTokenDetails: { cacheReadTokens: 3 },
              outputTokenDetails: { reasoningTokens: 1 },
            },
          },
        ],
      },
    });

    expect(result?.inputTokens).toBe(15);
    expect(result?.outputTokens).toBe(6);
    expect(result?.cachedInputTokens).toBe(9);
    expect(result?.reasoningTokens).toBe(2);
    expect(result?.steps).toEqual([
      {
        input_tokens: 10,
        output_tokens: 4,
        reasoning_tokens: 1,
        cached_input_tokens: 6,
      },
      {
        input_tokens: 5,
        output_tokens: 2,
        reasoning_tokens: 1,
        cached_input_tokens: 3,
      },
    ]);
  });
});
