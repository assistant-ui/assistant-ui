import type { ThreadMessage, ToolCallMessagePart } from "@assistant-ui/core";
import type { ToolCallApproval } from "assistant-stream";
import { describe, expect, it } from "vitest";
import { toLanguageModelMessages } from "./toLanguageModelMessages";
import { toModelMessages } from "./toModelMessages";

const toolCall = (
  toolCallId: string,
  part: Omit<Partial<ToolCallMessagePart>, "approval"> & {
    approval?: ToolCallApproval;
  },
): ToolCallMessagePart =>
  ({
    type: "tool-call",
    toolCallId,
    toolName: "delete_file",
    args: { path: `/tmp/${toolCallId}` },
    argsText: "{}",
    ...part,
  }) as ToolCallMessagePart;

const assistant = (
  id: string,
  status: Extract<ThreadMessage, { role: "assistant" }>["status"],
  content: Extract<ThreadMessage, { role: "assistant" }>["content"],
): ThreadMessage => ({
  id,
  role: "assistant",
  createdAt: new Date(0),
  status,
  metadata: {
    custom: {},
    steps: [],
    unstable_data: [],
    unstable_annotations: [],
    unstable_state: {},
  },
  content,
});

const user: ThreadMessage = {
  id: "user-1",
  role: "user",
  createdAt: new Date(0),
  content: [{ type: "text", text: "Delete both" }],
  attachments: [],
  metadata: { custom: {} },
};

const call = (toolCallId: string) => ({
  type: "tool-call",
  toolCallId,
  toolName: "delete_file",
  input: { path: `/tmp/${toolCallId}` },
});

describe("toModelMessages", () => {
  it("returns toLanguageModelMessages' output when no approval is decided", () => {
    const messages = [
      user,
      assistant("assistant-1", { type: "complete", reason: "stop" }, [
        toolCall("a", { result: { ok: true } }),
      ]),
      { ...user, id: "user-2" },
      assistant(
        "assistant-2",
        { type: "requires-action", reason: "tool-calls" },
        [toolCall("b", { approval: { id: "approval-b" } })],
      ),
    ];
    expect(toModelMessages(messages, {})).toEqual(
      toLanguageModelMessages(messages),
    );
  });

  it.each([false, true])(
    "replays decided approvals of an earlier turn with message IDs %s",
    (unstable_includeId) => {
      const messages = [
        user,
        assistant("assistant-1", { type: "complete", reason: "stop" }, [
          toolCall("a", {
            result: { deleted: true },
            approval: {
              id: "approval-a",
              approved: true,
              isAutomatic: false,
              signature: "sig-a",
              requestReason: "deletes a file",
              inputSchemaInput: { path: "/tmp/a" },
            },
          }),
          toolCall("b", {
            result: { error: "not now" },
            isError: true,
            approval: { id: "approval-b", approved: false, reason: "not now" },
          }),
          toolCall("c", { result: { ok: true } }),
          { type: "text", text: "Deleted a" },
        ]),
        { ...user, id: "user-2" },
      ];
      const ids = (id: string) =>
        unstable_includeId ? { unstable_id: id } : {};

      expect(toModelMessages(messages, { unstable_includeId })).toEqual([
        {
          role: "user",
          content: [{ type: "text", text: "Delete both" }],
          ...ids("user-1"),
        },
        {
          role: "assistant",
          content: [
            call("a"),
            {
              type: "tool-approval-request",
              approvalId: "approval-a",
              toolCallId: "a",
              reason: "deletes a file",
              isAutomatic: false,
              signature: "sig-a",
              inputSchemaInput: { path: "/tmp/a" },
            },
            call("b"),
            {
              type: "tool-approval-request",
              approvalId: "approval-b",
              toolCallId: "b",
            },
            call("c"),
          ],
          ...ids("assistant-1"),
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-approval-response",
              approvalId: "approval-a",
              approved: true,
            },
            {
              type: "tool-approval-response",
              approvalId: "approval-b",
              approved: false,
              reason: "not now",
            },
            {
              type: "tool-result",
              toolCallId: "a",
              toolName: "delete_file",
              output: { type: "json", value: { deleted: true } },
            },
            {
              type: "tool-result",
              toolCallId: "b",
              toolName: "delete_file",
              output: { type: "execution-denied", reason: "not now" },
            },
            {
              type: "tool-result",
              toolCallId: "c",
              toolName: "delete_file",
              output: { type: "json", value: { ok: true } },
            },
          ],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "Deleted a" }],
          ...ids("assistant-1"),
        },
        {
          role: "user",
          content: [{ type: "text", text: "Delete both" }],
          ...ids("user-2"),
        },
      ]);
    },
  );
});
