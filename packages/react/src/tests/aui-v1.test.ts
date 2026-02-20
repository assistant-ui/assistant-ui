import { describe, expect, it } from "vitest";
import type { CloudMessage } from "assistant-cloud";
import type { ThreadMessage } from "../types";
import { auiV0Encode } from "../legacy-runtime/cloud/auiV0";
import { __internal_AssistantCloudThreadHistoryAdapter } from "../legacy-runtime/cloud/AssistantCloudThreadHistoryAdapter";
import {
  auiV1Decode,
  auiV1Encode,
  decodeAuiV1OrV0Messages,
} from "../legacy-runtime/cloud/auiV1";

const makeAssistantMessage = (
  id: string,
  content: ThreadMessage["content"],
): ThreadMessage => ({
  id,
  createdAt: new Date("2026-02-14T00:00:00.000Z"),
  role: "assistant",
  content,
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

describe("auiV1", () => {
  it("encodes and decodes component message parts", () => {
    const message = makeAssistantMessage("assistant-v1", [
      {
        type: "text",
        text: "hello",
      },
      {
        type: "component",
        name: "status-chip",
        instanceId: "chip-1",
        parentId: "text-1",
        props: { label: "Ready" },
      },
    ]);

    const encoded = auiV1Encode(message);
    expect(encoded.content).toEqual([
      { type: "text", text: "hello" },
      {
        type: "component",
        name: "status-chip",
        instanceId: "chip-1",
        parentId: "text-1",
        props: { label: "Ready" },
      },
    ]);

    const decoded = auiV1Decode({
      id: "remote-1",
      parent_id: "root-1",
      height: 0,
      created_at: new Date("2026-02-14T00:00:10.000Z"),
      updated_at: new Date("2026-02-14T00:00:10.000Z"),
      format: "aui/v1",
      content: encoded as CloudMessage["content"],
    });

    expect(decoded.parentId).toBe("root-1");
    expect(decoded.message.id).toBe("remote-1");
    expect(decoded.message.content).toEqual([
      { type: "text", text: "hello" },
      {
        type: "component",
        name: "status-chip",
        instanceId: "chip-1",
        parentId: "text-1",
        props: { label: "Ready" },
      },
    ]);
  });

  it("decodes mixed v0 and v1 messages in stable order with parent linkage", () => {
    const v0Parent = makeAssistantMessage("parent-local", [
      { type: "text", text: "parent" },
    ]);
    const v1Child = makeAssistantMessage("child-local", [
      { type: "component", name: "status-chip", props: { label: "Done" } },
    ]);

    const decoded = decodeAuiV1OrV0Messages([
      {
        id: "child-remote",
        parent_id: "parent-remote",
        height: 1,
        created_at: new Date("2026-02-14T00:00:20.000Z"),
        updated_at: new Date("2026-02-14T00:00:20.000Z"),
        format: "aui/v1",
        content: auiV1Encode(v1Child) as CloudMessage["content"],
      },
      {
        id: "ignored",
        parent_id: null,
        height: 0,
        created_at: new Date("2026-02-14T00:00:15.000Z"),
        updated_at: new Date("2026-02-14T00:00:15.000Z"),
        format: "other/v1",
        content: {},
      },
      {
        id: "parent-remote",
        parent_id: null,
        height: 0,
        created_at: new Date("2026-02-14T00:00:10.000Z"),
        updated_at: new Date("2026-02-14T00:00:10.000Z"),
        format: "aui/v0",
        content: auiV0Encode(v0Parent) as CloudMessage["content"],
      },
    ]);

    expect(decoded).toHaveLength(2);
    expect(decoded[0]?.message.id).toBe("child-remote");
    expect(decoded[0]?.parentId).toBe("parent-remote");
    expect(decoded[0]?.message.content).toEqual([
      { type: "component", name: "status-chip", props: { label: "Done" } },
    ]);
    expect(decoded[1]?.message.id).toBe("parent-remote");
    expect(decoded[1]?.parentId).toBeNull();
  });

  it("keeps parent linkage in mixed decode when a v1 message carries audio/data parts", () => {
    const v0Parent = makeAssistantMessage("v0-parent-local", [
      { type: "text", text: "parent" },
    ]);
    const v1Child = makeAssistantMessage("v1-child-local", [
      {
        type: "audio",
        audio: { data: "UklGRgAAAQ==", format: "wav" },
      } as any,
      { type: "data", name: "status", data: { ok: true } },
    ]);

    const decoded = decodeAuiV1OrV0Messages([
      {
        id: "v1-child-remote",
        parent_id: "v0-parent-remote",
        height: 1,
        created_at: new Date("2026-02-14T00:00:20.000Z"),
        updated_at: new Date("2026-02-14T00:00:20.000Z"),
        format: "aui/v1",
        content: auiV1Encode(v1Child) as CloudMessage["content"],
      },
      {
        id: "v0-parent-remote",
        parent_id: null,
        height: 0,
        created_at: new Date("2026-02-14T00:00:10.000Z"),
        updated_at: new Date("2026-02-14T00:00:10.000Z"),
        format: "aui/v0",
        content: auiV0Encode(v0Parent) as CloudMessage["content"],
      },
    ]);

    expect(decoded[0]?.parentId).toBe("v0-parent-remote");
    expect(decoded[0]?.message.content).toEqual([
      { type: "audio", audio: { data: "UklGRgAAAQ==", format: "wav" } },
      { type: "data", name: "status", data: { ok: true } },
    ]);
    expect(decoded[1]?.parentId).toBeNull();
  });

  it("extracts telemetry from aui/v1 assistant content", () => {
    const message = makeAssistantMessage("assistant-v1", [
      { type: "text", text: "hello world" },
      {
        type: "tool-call",
        toolCallId: "tc-1",
        toolName: "lookup",
        args: { q: "weather" },
        argsText: '{"q":"weather"}',
        result: { ok: true },
      },
      {
        type: "component",
        name: "status-chip",
        instanceId: "chip-1",
        props: { label: "Ready" },
      },
    ]);
    const encoded = auiV1Encode(message);

    const telemetry =
      __internal_AssistantCloudThreadHistoryAdapter.extractTelemetry(
        "aui/v1",
        encoded,
      );

    expect(telemetry).toMatchObject({
      status: "completed",
      outputText: "hello world",
      toolCalls: [
        {
          tool_name: "lookup",
          tool_call_id: "tc-1",
        },
      ],
    });
  });
});
