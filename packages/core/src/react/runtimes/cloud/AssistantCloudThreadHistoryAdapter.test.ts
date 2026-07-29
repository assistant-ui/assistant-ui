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
});
