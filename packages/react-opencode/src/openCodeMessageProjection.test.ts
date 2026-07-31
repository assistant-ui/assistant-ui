import { describe, it, expect } from "vitest";
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

  it("projects Task child sessions into nested tool-call messages", () => {
    const grandchildState: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_grandchild"),
      loadState: { type: "ready" },
      messageOrder: ["grandchild-assistant"],
      messagesById: {
        "grandchild-assistant": {
          id: "grandchild-assistant",
          info: {
            id: "grandchild-assistant",
            role: "assistant",
            sessionID: "ses_grandchild",
            parentID: "grandchild-user",
            modelID: "model",
            providerID: "provider",
            mode: "subagent",
            path: { cwd: "/", root: "/" },
            cost: 0,
            tokens: {
              input: 0,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
            time: { created: 4 },
            finish: "stop",
          } as never,
          parts: [
            {
              id: "grandchild-text",
              sessionID: "ses_grandchild",
              messageID: "grandchild-assistant",
              type: "text",
              text: "The nested dependency is healthy.",
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };
    const childState: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_child"),
      loadState: { type: "ready" },
      childSessionsById: { ses_grandchild: grandchildState },
      messageOrder: ["child-user", "child-assistant"],
      messagesById: {
        "child-user": {
          id: "child-user",
          info: {
            id: "child-user",
            role: "user",
            sessionID: "ses_child",
            time: { created: 2 },
          } as never,
          parts: [
            {
              id: "child-user-text",
              sessionID: "ses_child",
              messageID: "child-user",
              type: "text",
              text: "Inspect the package",
            } as never,
          ],
          shadowParts: undefined,
        },
        "child-assistant": {
          id: "child-assistant",
          info: {
            id: "child-assistant",
            role: "assistant",
            sessionID: "ses_child",
            parentID: "child-user",
            modelID: "model",
            providerID: "provider",
            mode: "subagent",
            path: { cwd: "/", root: "/" },
            cost: 0,
            tokens: {
              input: 0,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
            time: { created: 3 },
            finish: "stop",
          } as never,
          parts: [
            {
              id: "child-assistant-text",
              sessionID: "ses_child",
              messageID: "child-assistant",
              type: "text",
              text: "The package is healthy.",
            } as never,
            {
              id: "child-task",
              callID: "child-task-call",
              sessionID: "ses_child",
              messageID: "child-assistant",
              type: "tool",
              tool: "task",
              state: {
                status: "completed",
                input: { description: "Inspect nested dependency" },
                output: "Done",
                metadata: { sessionId: "ses_grandchild" },
              },
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };
    const state: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_parent"),
      childSessionsById: { ses_child: childState },
      messageOrder: ["assistant-1"],
      messagesById: {
        "assistant-1": {
          id: "assistant-1",
          info: {
            id: "assistant-1",
            role: "assistant",
            sessionID: "ses_parent",
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
              sessionID: "ses_parent",
              messageID: "assistant-1",
              type: "tool",
              tool: "task",
              state: {
                status: "completed",
                input: { description: "Review package" },
                output: "Done",
                metadata: { sessionId: "ses_child" },
              },
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);
    const tool = messages[0]?.content[0];

    expect(tool).toMatchObject({
      type: "tool-call",
      toolName: "task",
      messages: [
        { id: "child-user", role: "user" },
        { id: "child-assistant", role: "assistant" },
      ],
    });
    if (typeof tool === "string" || tool?.type !== "tool-call") {
      throw new Error("Expected a task tool call");
    }
    expect(tool.messages?.[0]?.content).toEqual([
      { type: "text", text: "Inspect the package" },
    ]);
    expect(tool.messages?.[1]?.content).toEqual([
      { type: "text", text: "The package is healthy." },
      expect.objectContaining({
        type: "tool-call",
        toolName: "task",
        messages: [
          expect.objectContaining({
            id: "grandchild-assistant",
            role: "assistant",
            content: [
              {
                type: "text",
                text: "The nested dependency is healthy.",
              },
            ],
          }),
        ],
      }),
    ]);
  });

  it("does not associate non-Task tools or invalid child metadata", () => {
    const state: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_parent"),
      childSessionsById: {
        ses_child: createOpenCodeThreadState("ses_child"),
      },
      messageOrder: ["assistant-1"],
      messagesById: {
        "assistant-1": {
          id: "assistant-1",
          info: {
            id: "assistant-1",
            role: "assistant",
            sessionID: "ses_parent",
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
              sessionID: "ses_parent",
              messageID: "assistant-1",
              type: "tool",
              tool: "read",
              state: {
                status: "completed",
                input: {},
                output: "Done",
                metadata: { sessionId: "ses_child" },
              },
            } as never,
            {
              id: "tool-2",
              callID: "call-2",
              sessionID: "ses_parent",
              messageID: "assistant-1",
              type: "tool",
              tool: "task",
              state: {
                status: "completed",
                input: {},
                output: "Done",
                metadata: { sessionId: 42 },
              },
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);
    expect(messages[0]?.content).toEqual([
      expect.not.objectContaining({ messages: expect.anything() }),
      expect.not.objectContaining({ messages: expect.anything() }),
    ]);
  });

  it("marks assistant messages with pending permission requests as requires-action", () => {
    const state: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_1"),
      interactions: {
        permissions: {
          pending: {
            permission_1: {
              id: "permission_1",
              sessionId: "ses_1",
              permission: "bash",
              patterns: [],
              metadata: {},
              always: ["git *"],
              askedAt: 1000,
              raw: {} as never,
              tool: {
                messageID: "assistant-1",
                callID: "call-1",
              },
            },
          },
          resolved: {},
        },
        questions: {
          pending: {},
          answered: {},
          rejected: {},
        },
      },
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
              tool: "bash",
              state: {
                status: "pending",
                input: { command: "ls" },
                raw: "ls",
              },
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);
    expect(messages[0]?.status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });
    expect(messages[0]?.content).toMatchObject([
      {
        type: "tool-call",
        toolCallId: "call-1",
        approval: {
          id: "permission_1",
          options: [
            { id: "once", kind: "allow-once" },
            {
              id: "always",
              kind: "allow-always",
              grants: ["git *"],
              confirm: true,
            },
            { id: "reject", kind: "reject-once" },
          ],
        },
      },
    ]);
  });

  it("projects resolved permissions as recorded approval decisions", () => {
    const base = createOpenCodeThreadState("ses_1");
    const state: OpenCodeThreadState = {
      ...base,
      interactions: {
        ...base.interactions,
        permissions: {
          pending: {},
          resolved: {
            permission_1: {
              request: {
                id: "permission_1",
                sessionId: "ses_1",
                permission: "bash",
                patterns: [],
                metadata: {},
                always: ["git *"],
                askedAt: 1000,
                raw: {} as never,
                tool: {
                  messageID: "assistant-1",
                  callID: "call-1",
                },
              },
              reply: "once",
              respondedAt: 2000,
            },
          },
        },
      },
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
              tool: "bash",
              state: {
                status: "pending",
                input: { command: "ls" },
                raw: "ls",
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
        approval: {
          id: "permission_1",
          approved: true,
          optionId: "once",
        },
      },
    ]);
  });

  it("marks assistant messages with pending question requests as requires-action", () => {
    const state: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_1"),
      interactions: {
        permissions: {
          pending: {},
          resolved: {},
        },
        questions: {
          pending: {
            question_1: {
              id: "question_1",
              sessionID: "ses_1",
              questions: [],
              askedAt: 1000,
              tool: {
                messageID: "assistant-1",
                callID: "call-1",
              },
            },
          },
          answered: {},
          rejected: {},
        },
      },
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
              tool: "request_user_input",
              state: {
                status: "pending",
                input: {},
                raw: "",
              },
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);
    expect(messages[0]?.status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });
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

  it("projects unsupported OpenCode parts into visible data fallbacks", () => {
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
              id: "custom-1",
              sessionID: "ses_1",
              messageID: "assistant-1",
              type: "future-part",
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);
    expect(messages[0]?.content).toMatchObject([
      {
        type: "data",
        name: "opencode-unsupported-part",
        data: { type: "future-part" },
      },
    ]);
  });

  it("handles non-object assistant errors without throwing", () => {
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
            error: "Request failed",
          } as never,
          parts: [],
          shadowParts: undefined,
        },
      },
    };

    const messages = projectOpenCodeThreadMessages(state);
    expect(messages[0]?.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "Request failed",
    });
  });

  it("reuses the projected child transcript while the child state is unchanged", () => {
    const childState: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_child"),
      loadState: { type: "ready" },
      messageOrder: ["child-assistant"],
      messagesById: {
        "child-assistant": {
          id: "child-assistant",
          info: {
            id: "child-assistant",
            role: "assistant",
            sessionID: "ses_child",
            parentID: "child-user",
            modelID: "model",
            providerID: "provider",
            mode: "subagent",
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
              id: "child-text",
              sessionID: "ses_child",
              messageID: "child-assistant",
              type: "text",
              text: "Subagent finished.",
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };
    const state: OpenCodeThreadState = {
      ...createOpenCodeThreadState("ses_parent"),
      childSessionsById: { ses_child: childState },
      messageOrder: ["assistant-1"],
      messagesById: {
        "assistant-1": {
          id: "assistant-1",
          info: {
            id: "assistant-1",
            role: "assistant",
            sessionID: "ses_parent",
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
              id: "task-part",
              callID: "task-call",
              sessionID: "ses_parent",
              messageID: "assistant-1",
              type: "tool",
              tool: "task",
              state: {
                status: "completed",
                input: { description: "Inspect dependency" },
                output: "Done",
                metadata: { sessionId: "ses_child" },
              },
            } as never,
          ],
          shadowParts: undefined,
        },
      },
    };

    const readNested = (
      projected: ReturnType<typeof projectOpenCodeThreadMessages>,
    ) => {
      const part = projected[0]?.content.find((p) => p.type === "tool-call");
      return part?.type === "tool-call" ? part.messages : undefined;
    };

    const first = readNested(projectOpenCodeThreadMessages(state));
    const second = readNested(
      projectOpenCodeThreadMessages({ ...state, runState: { type: "idle" } }),
    );

    expect(first).toHaveLength(1);
    expect(second).toBe(first);
  });

  it("omits nested messages until the child session has loaded", () => {
    const state = (loadState: OpenCodeThreadState["loadState"]) =>
      ({
        ...createOpenCodeThreadState("ses_parent"),
        childSessionsById: {
          ses_child: {
            ...createOpenCodeThreadState("ses_child"),
            loadState,
          },
        },
        messageOrder: ["assistant-1"],
        messagesById: {
          "assistant-1": {
            id: "assistant-1",
            info: {
              id: "assistant-1",
              role: "assistant",
              sessionID: "ses_parent",
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
                id: "task-part",
                callID: "task-call",
                sessionID: "ses_parent",
                messageID: "assistant-1",
                type: "tool",
                tool: "task",
                state: {
                  status: "running",
                  input: { description: "Inspect" },
                  metadata: { sessionId: "ses_child" },
                },
              } as never,
            ],
            shadowParts: undefined,
          },
        },
      }) satisfies OpenCodeThreadState;

    const toolPart = (loadState: OpenCodeThreadState["loadState"]) =>
      projectOpenCodeThreadMessages(state(loadState))[0]?.content.find(
        (p) => p.type === "tool-call",
      );

    expect(toolPart({ type: "loading" })).toBeDefined();
    expect(toolPart({ type: "loading" })).not.toHaveProperty("messages");
    expect(toolPart({ type: "idle" })).not.toHaveProperty("messages");
    expect(toolPart({ type: "error", error: "boom" })).not.toHaveProperty(
      "messages",
    );
    expect(toolPart({ type: "ready" })).toHaveProperty("messages", []);
  });
});
