import { describe, expect, it } from "vitest";
import { projectOpenCodeThreadRepository } from "./openCodeMessageProjection";
import { createOpenCodeThreadState } from "./openCodeThreadState";
import type { AssistantMessage, Part, UserMessage } from "./types";

const assistant: AssistantMessage = {
  id: "assistant-1",
  sessionID: "ses_1",
  role: "assistant",
  parentID: "user-1",
  modelID: "model",
  providerID: "provider",
  mode: "primary",
  agent: "build",
  path: { cwd: "/", root: "/" },
  cost: 0,
  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  time: { created: 1 },
  finish: "stop",
};
const user: UserMessage = {
  id: "user-1",
  sessionID: "ses_1",
  role: "user",
  time: { created: 0 },
  agent: "build",
  model: { providerID: "provider", modelID: "model" },
};
const base = { id: "prt_stable", sessionID: "ses_1", messageID: "assistant-1" };
const cases: Array<{ name: string; part: Part; type: string }> = [
  {
    name: "text",
    part: { ...base, type: "text", text: "answer" },
    type: "text",
  },
  {
    name: "reasoning",
    part: {
      ...base,
      type: "reasoning",
      text: "thinking",
      time: { start: 1, end: 2 },
    },
    type: "reasoning",
  },
  {
    name: "image",
    part: {
      ...base,
      type: "file",
      mime: "image/png",
      filename: "plot.png",
      url: "https://example.com/plot.png",
    },
    type: "image",
  },
  {
    name: "PDF",
    part: {
      ...base,
      type: "file",
      mime: "application/pdf",
      filename: "report.pdf",
      url: "https://example.com/report.pdf",
    },
    type: "file",
  },
  {
    name: "audio",
    part: {
      ...base,
      type: "file",
      mime: "audio/wav",
      filename: "clip.wav",
      url: "https://example.com/clip.wav",
    },
    type: "file",
  },
  {
    name: "step start",
    part: { ...base, type: "step-start", snapshot: "snapshot" },
    type: "data",
  },
  {
    name: "step finish",
    part: {
      ...base,
      type: "step-finish",
      reason: "stop",
      cost: 0,
      tokens: assistant.tokens,
    },
    type: "data",
  },
  {
    name: "patch",
    part: { ...base, type: "patch", hash: "hash", files: ["index.ts"] },
    type: "data",
  },
  {
    name: "snapshot",
    part: { ...base, type: "snapshot", snapshot: "snapshot" },
    type: "data",
  },
  {
    name: "agent",
    part: { ...base, type: "agent", name: "build" },
    type: "data",
  },
  {
    name: "subtask",
    part: {
      ...base,
      type: "subtask",
      agent: "build",
      prompt: "inspect",
      description: "inspect",
    },
    type: "data",
  },
];
function project(info: AssistantMessage | UserMessage, parts: Part[]) {
  return projectOpenCodeThreadRepository({
    ...createOpenCodeThreadState("ses_1"),
    messageOrder: [info.id],
    messagesById: {
      [info.id]: { id: info.id, info, parts, shadowParts: undefined },
    },
  }).messages[0]!.message;
}

describe("OpenCode part identities", () => {
  it.each(cases)(
    "preserves the $name part identity in the exported repository",
    ({ part, type }) => {
      expect(project(assistant, [part]).content).toMatchObject([
        { type, id: "prt_stable" },
      ]);
    },
  );
  it("preserves text and attachment content identities in user history", () => {
    expect(
      project(user, [
        { ...base, messageID: user.id, type: "text", text: "inspect" },
        {
          ...base,
          messageID: user.id,
          id: "prt_pdf",
          type: "file",
          mime: "application/pdf",
          filename: "report.pdf",
          url: "https://example.com/report.pdf",
        },
      ]),
    ).toMatchObject({
      content: [{ type: "text", id: "prt_stable", text: "inspect" }],
      attachments: [
        { id: "prt_pdf", content: [{ type: "file", id: "prt_pdf" }] },
      ],
    });
  });
  it("retains error results, tool identities, and original parts", () => {
    const part: Part = {
      ...base,
      type: "tool",
      callID: "call-1",
      tool: "read",
      state: {
        status: "error",
        input: { file: "missing.txt" },
        error: "not found",
        time: { start: 1, end: 2 },
      },
    };
    expect(project(assistant, [part])).toMatchObject({
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          result: "not found",
          isError: true,
          args: { file: "missing.txt" },
          timing: { startedAt: 1, completedAt: 2 },
        },
      ],
      metadata: { custom: { opencode: { parts: [part] } } },
    });
  });
});
