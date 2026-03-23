import { projectOpenCodeThreadMessages } from "./openCodeMessageProjection";
import { createOpenCodeThreadState } from "./openCodeThreadState";
import type { OpenCodeThreadState } from "./types";

describe("projectOpenCodeThreadMessages", () => {
  it("merges consecutive assistant messages into one projected message", () => {
    const state: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_1"),
      messageOrder: ["assistant-1", "assistant-2"],
      messagesById: {
        "assistant-1": {
          id: "assistant-1",
          info: {
            id: "assistant-1",
            role: "assistant",
            sessionID: "ses_1",
            parentID: "user-1",
            modelID: "model",
            providerID: "provider",
            mode: "primary",
            path: { cwd: "/", root: "/" },
            cost: 0,
            tokens: {
              input: 0,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
            time: { created: 1 },
          } as never,
          parts: [
            {
              id: "step-1",
              sessionID: "ses_1",
              messageID: "assistant-1",
              type: "step-start",
            } as never,
          ],
          shadowParts: undefined,
        },
        "assistant-2": {
          id: "assistant-2",
          info: {
            id: "assistant-2",
            role: "assistant",
            sessionID: "ses_1",
            parentID: "assistant-1",
            modelID: "model",
            providerID: "provider",
            mode: "primary",
            path: { cwd: "/", root: "/" },
            cost: 0,
            tokens: {
              input: 0,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
            time: { created: 2 },
            finish: "stop",
          } as never,
          parts: [
            {
              id: "patch-1",
              sessionID: "ses_1",
              messageID: "assistant-2",
              type: "patch",
              hash: "hash",
              files: ["a.ts"],
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe("assistant");
    expect(messages[0]?.content).toMatchObject([
      { type: "data", name: "opencode-step-start" },
      { type: "data", name: "opencode-patch" },
    ]);
    expect(messages[0]).not.toHaveProperty("unstable_execution");
  });

  it("projects OpenCode tools into tool-call parts", () => {
    const state: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_1"),
      messageOrder: ["assistant-1"],
      messagesById: {
        "assistant-1": {
          id: "assistant-1",
          info: {
            id: "assistant-1",
            role: "assistant",
            sessionID: "ses_1",
            parentID: "user-1",
            modelID: "model",
            providerID: "provider",
            mode: "primary",
            path: { cwd: "/", root: "/" },
            cost: 0,
            tokens: {
              input: 0,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
            time: { created: 1 },
            finish: "stop",
          } as never,
          parts: [
            {
              id: "tool-1",
              callID: "call-1",
              sessionID: "ses_1",
              messageID: "assistant-1",
              type: "tool",
              tool: "read",
              state: {
                status: "completed",
                input: { path: "README.md" },
                output: { ok: true },
              },
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);
    expect(messages[0]?.content).toMatchObject([
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "read",
        result: { ok: true },
      },
    ]);
  });

  it("normalizes escaped newlines in reasoning parts", () => {
    const state: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_1"),
      messageOrder: ["assistant-1"],
      messagesById: {
        "assistant-1": {
          id: "assistant-1",
          info: {
            id: "assistant-1",
            role: "assistant",
            sessionID: "ses_1",
            parentID: "user-1",
            modelID: "model",
            providerID: "provider",
            mode: "primary",
            path: { cwd: "/", root: "/" },
            cost: 0,
            tokens: {
              input: 0,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
            time: { created: 1 },
            finish: "stop",
          } as never,
          parts: [
            {
              id: "reasoning-1",
              sessionID: "ses_1",
              messageID: "assistant-1",
              type: "reasoning",
              text: "Confirming\\n\\nI checked the file.",
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);
    expect(messages[0]?.content).toMatchObject([
      {
        type: "reasoning",
        text: "Confirming\n\nI checked the file.",
      },
    ]);
  });
});
