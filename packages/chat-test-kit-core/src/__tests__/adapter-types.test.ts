import { describe, expect, it } from "vitest";

import type {
  AssistantEvent,
  RuntimeAdapter,
  RuntimeSnapshot,
} from "../adapter/types";
import type { ContentPart } from "../transcript/types";

describe("adapter types", () => {
  it("AssistantEvent variants", () => {
    const events: AssistantEvent[] = [
      { type: "text-delta", delta: "hi" },
      {
        type: "tool-call",
        toolCallId: "tc_1",
        toolName: "x",
        args: {},
        argsText: "{}",
      },
      { type: "tool-result", toolCallId: "tc_1", value: 1 },
      { type: "finish", reason: "stop" },
      { type: "transport-error", message: "boom" },
      { type: "disconnect" },
    ];
    expect(events).toHaveLength(6);
  });

  it("RuntimeAdapter interface is implementable", () => {
    const adapter: RuntimeAdapter = {
      async sendUserMessage(_content: ContentPart[]) {},
      async emit(_event: AssistantEvent) {},
      getSnapshot(): RuntimeSnapshot {
        return { events: [], abortCount: 0, userMessages: [] };
      },
      async abort() {},
    };
    expect(typeof adapter.emit).toBe("function");
  });
});
