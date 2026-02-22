import { describe, expect, it } from "vitest";
import { AssistantMessageStream } from "./AssistantMessageStream";
import { createAssistantStream } from "../modules/assistant-stream";

describe("AssistantMessageStream component integration", () => {
  it("accumulates component parts end-to-end", async () => {
    const stream = createAssistantStream((controller) => {
      controller.withParentId("group-1").appendComponent({
        name: "status-chip",
        instanceId: "status-chip-1",
        props: { label: "Ready" },
      });
    });

    const result =
      await AssistantMessageStream.fromAssistantStream(
        stream,
      ).unstable_result();

    expect(result.parts).toHaveLength(1);
    expect(result.parts[0]).toMatchObject({
      type: "component",
      name: "status-chip",
      instanceId: "status-chip-1",
      props: { label: "Ready" },
      parentId: "group-1",
    });
  });
});
