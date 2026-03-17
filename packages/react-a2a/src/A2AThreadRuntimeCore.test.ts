import { describe, it, expect, vi, beforeEach } from "vitest";
import { A2AThreadRuntimeCore } from "./A2AThreadRuntimeCore";
import type { A2AClient } from "./A2AClient";
import type { A2AMessage, A2AStreamEvent, A2ATask } from "./types";
import type { AppendMessage, ThreadMessage } from "@assistant-ui/core";

// --- Mock client factory ---

function createMockClient(overrides: Partial<A2AClient> = {}): A2AClient {
  return {
    getAgentCard: vi.fn().mockRejectedValue(new Error("not found")),
    sendMessage: vi.fn().mockResolvedValue({
      id: "t1",
      status: { state: "completed" },
    } satisfies A2ATask),
    streamMessage: vi.fn().mockImplementation(async function* () {
      // default: empty stream
    }),
    getTask: vi.fn(),
    listTasks: vi.fn(),
    cancelTask: vi.fn().mockResolvedValue({
      id: "t1",
      status: { state: "canceled" },
    }),
    subscribeToTask: vi.fn(),
    getExtendedAgentCard: vi.fn(),
    createTaskPushNotificationConfig: vi.fn(),
    getTaskPushNotificationConfig: vi.fn(),
    listTaskPushNotificationConfigs: vi.fn(),
    deleteTaskPushNotificationConfig: vi.fn(),
    ...overrides,
  } as unknown as A2AClient;
}

function createUserAppendMessage(text: string): AppendMessage {
  return {
    parentId: null,
    role: "user",
    content: [{ type: "text", text }],
  };
}

function statusUpdateEvent(state: string, text?: string): A2AStreamEvent {
  return {
    type: "statusUpdate",
    event: {
      taskId: "t1",
      contextId: "ctx-1",
      status: {
        state: state as any,
        ...(text && {
          message: {
            messageId: "s1",
            role: "agent" as const,
            parts: [{ text }],
          },
        }),
      },
    },
  };
}

function artifactUpdateEvent(
  artifactId: string,
  parts: { text: string }[],
  opts: { append?: boolean; lastChunk?: boolean } = {},
): A2AStreamEvent {
  return {
    type: "artifactUpdate",
    event: {
      taskId: "t1",
      contextId: "ctx-1",
      artifact: { artifactId, name: artifactId, parts },
      append: opts.append,
      lastChunk: opts.lastChunk,
    },
  };
}

describe("A2AThreadRuntimeCore", () => {
  let notifyUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    notifyUpdate = vi.fn();
  });

  function createCore(
    clientOverrides: Partial<A2AClient> = {},
    coreOverrides: Record<string, unknown> = {},
  ) {
    return new A2AThreadRuntimeCore({
      client: createMockClient(clientOverrides),
      notifyUpdate,
      ...coreOverrides,
    });
  }

  // --- Basic state ---

  describe("initial state", () => {
    it("starts with no messages", () => {
      const core = createCore();
      expect(core.getMessages()).toEqual([]);
    });

    it("starts not running", () => {
      const core = createCore();
      expect(core.isRunning()).toBe(false);
    });

    it("starts with no task", () => {
      const core = createCore();
      expect(core.getTask()).toBeUndefined();
    });

    it("starts with no artifacts", () => {
      const core = createCore();
      expect(core.getArtifacts()).toEqual([]);
    });
  });

  // --- Edit & Reload ---

  describe("edit", () => {
    it("delegates to append", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield statusUpdateEvent("completed", "Edited response");
        }),
      });

      await core.edit(createUserAppendMessage("Edited"));

      const messages = core.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]!.role).toBe("user");
      expect(messages[1]!.role).toBe("assistant");
    });
  });

  describe("reload", () => {
    it("resets to parent and re-runs", async () => {
      let runCount = 0;
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          runCount++;
          yield statusUpdateEvent("completed", `Run ${runCount}`);
        }),
      });

      await core.append(createUserAppendMessage("Hello"));
      expect(core.getMessages()).toHaveLength(2);

      const userId = core.getMessages()[0]!.id;
      await core.reload(userId);

      // After reload: user message + new assistant message
      expect(core.getMessages()).toHaveLength(2);
      const assistant = core.getMessages()[1]!;
      expect(assistant.content).toEqual([{ type: "text", text: "Run 2" }]);
    });
  });

  // --- Streaming run ---

  describe("streaming run", () => {
    it("processes status update events into messages", async () => {
      const events: A2AStreamEvent[] = [
        statusUpdateEvent("working", "Thinking..."),
        statusUpdateEvent("completed", "Done!"),
      ];

      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          for (const e of events) yield e;
        }),
      });

      await core.append(createUserAppendMessage("Hello"));

      const messages = core.getMessages();
      expect(messages).toHaveLength(2); // user + assistant
      expect(messages[0]!.role).toBe("user");
      expect(messages[1]!.role).toBe("assistant");

      const assistant = messages[1]!;
      // Final content should be "Done!"
      expect(assistant.content).toEqual([{ type: "text", text: "Done!" }]);
      expect(assistant.status).toEqual({
        type: "complete",
        reason: "stop",
      });
    });

    it("tracks task state from status updates", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield statusUpdateEvent("working", "...");
          yield statusUpdateEvent("completed", "Done");
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      const task = core.getTask();
      expect(task).toBeDefined();
      expect(task!.id).toBe("t1");
      expect(task!.status.state).toBe("completed");
    });

    it("tracks context ID from events", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield statusUpdateEvent("completed", "Done");
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      const task = core.getTask();
      expect(task!.contextId).toBe("ctx-1");
    });

    it("is running during stream and not after", async () => {
      let wasRunningDuringStream = false;
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          // Capture isRunning state mid-stream
          wasRunningDuringStream = core.isRunning();
          yield statusUpdateEvent("completed", "Done");
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      expect(wasRunningDuringStream).toBe(true);
      expect(core.isRunning()).toBe(false);
    });
  });

  // --- Sync (non-streaming) fallback ---

  describe("sync fallback", () => {
    it("uses sendMessage when streaming is false in agent card", async () => {
      const sendMessage = vi.fn().mockResolvedValue({
        id: "t1",
        status: {
          state: "completed",
          message: {
            messageId: "s1",
            role: "agent",
            parts: [{ text: "Sync response" }],
          },
        },
      } satisfies A2ATask);

      const streamMessage = vi.fn();

      const core = createCore({ sendMessage, streamMessage });
      // Simulate agent card with streaming: false
      (core as any).agentCardValue = {
        capabilities: { streaming: false },
      };

      await core.append(createUserAppendMessage("Hello"));

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(streamMessage).not.toHaveBeenCalled();

      const messages = core.getMessages();
      const assistant = messages[1]!;
      expect(assistant.content).toEqual([
        { type: "text", text: "Sync response" },
      ]);
    });

    it("handles Message-only response (stateless agent)", async () => {
      const sendMessage = vi.fn().mockResolvedValue({
        messageId: "m2",
        role: "agent",
        parts: [{ text: "Quick answer" }],
      } satisfies A2AMessage);

      const core = createCore({ sendMessage });
      (core as any).agentCardValue = {
        capabilities: { streaming: false },
      };

      await core.append(createUserAppendMessage("Hello"));

      const messages = core.getMessages();
      expect(messages[1]!.content).toEqual([
        { type: "text", text: "Quick answer" },
      ]);
      expect(messages[1]!.status).toEqual({
        type: "complete",
        reason: "stop",
      });
    });
  });

  // --- Artifact handling ---

  describe("artifacts", () => {
    it("accumulates artifacts from artifact update events", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield artifactUpdateEvent("a1", [{ text: "code1" }]);
          yield artifactUpdateEvent("a2", [{ text: "code2" }]);
          yield statusUpdateEvent("completed", "Done");
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      const artifacts = core.getArtifacts();
      expect(artifacts).toHaveLength(2);
      expect(artifacts[0]!.artifactId).toBe("a1");
      expect(artifacts[1]!.artifactId).toBe("a2");
    });

    it("appends parts to existing artifact when append=true", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield artifactUpdateEvent("a1", [{ text: "part1" }]);
          yield artifactUpdateEvent("a1", [{ text: "part2" }], {
            append: true,
          });
          yield statusUpdateEvent("completed", "Done");
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      const artifacts = core.getArtifacts();
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0]!.parts).toHaveLength(2);
      expect(artifacts[0]!.parts[0]!.text).toBe("part1");
      expect(artifacts[0]!.parts[1]!.text).toBe("part2");
    });

    it("replaces artifact when append=false", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield artifactUpdateEvent("a1", [{ text: "old" }]);
          yield artifactUpdateEvent("a1", [{ text: "new" }]);
          yield statusUpdateEvent("completed", "Done");
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      const artifacts = core.getArtifacts();
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0]!.parts).toHaveLength(1);
      expect(artifacts[0]!.parts[0]!.text).toBe("new");
    });

    it("calls onArtifactComplete when lastChunk=true", async () => {
      const onArtifactComplete = vi.fn();

      const core = new A2AThreadRuntimeCore({
        client: createMockClient({
          streamMessage: vi.fn().mockImplementation(async function* () {
            yield artifactUpdateEvent("a1", [{ text: "code" }], {
              lastChunk: true,
            });
            yield statusUpdateEvent("completed", "Done");
          }),
        }),
        onArtifactComplete,
        notifyUpdate,
      });

      await core.append(createUserAppendMessage("Go"));

      expect(onArtifactComplete).toHaveBeenCalledTimes(1);
      expect(onArtifactComplete.mock.calls[0]![0].artifactId).toBe("a1");
    });

    it("resets artifacts on new run", async () => {
      let runCount = 0;

      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          runCount++;
          if (runCount === 1) {
            yield artifactUpdateEvent("a1", [{ text: "first" }]);
            yield statusUpdateEvent("completed", "Done");
          } else {
            yield statusUpdateEvent("completed", "Done");
          }
        }),
      });

      await core.append(createUserAppendMessage("First"));
      expect(core.getArtifacts()).toHaveLength(1);

      await core.append(createUserAppendMessage("Second"));
      expect(core.getArtifacts()).toHaveLength(0);
    });
  });

  // --- Task lifecycle ---

  describe("task lifecycle", () => {
    it("clears task after terminal state for new message", async () => {
      let runCount = 0;

      const streamMessage = vi.fn().mockImplementation(async function* () {
        runCount++;
        yield statusUpdateEvent("completed", `Run ${runCount}`);
      });

      const core = createCore({ streamMessage });

      await core.append(createUserAppendMessage("First"));
      expect(core.getTask()!.status.state).toBe("completed");

      await core.append(createUserAppendMessage("Second"));

      // Verify the second call didn't include the old taskId
      const secondCallMsg = streamMessage.mock.calls[1]![0] as A2AMessage;
      expect(secondCallMsg.taskId).toBeUndefined();
    });

    it("keeps taskId for non-terminal states (input_required)", async () => {
      let runCount = 0;

      const streamMessage = vi.fn().mockImplementation(async function* () {
        runCount++;
        if (runCount === 1) {
          yield statusUpdateEvent("input_required", "Need more info");
        } else {
          yield statusUpdateEvent("completed", "Done");
        }
      });

      const core = createCore({ streamMessage });

      await core.append(createUserAppendMessage("Start"));
      expect(core.getTask()!.status.state).toBe("input_required");

      await core.append(createUserAppendMessage("More info"));

      // Second call should include the taskId
      const secondCallMsg = streamMessage.mock.calls[1]![0] as A2AMessage;
      expect(secondCallMsg.taskId).toBe("t1");
    });
  });

  // --- Task snapshot ---

  describe("task snapshot", () => {
    it("handles full task snapshot from stream", async () => {
      const taskSnapshot: A2ATask = {
        id: "t1",
        contextId: "ctx-1",
        status: {
          state: "completed",
          message: {
            messageId: "s1",
            role: "agent",
            parts: [{ text: "Full snapshot" }],
          },
        },
        artifacts: [
          {
            artifactId: "a1",
            parts: [{ text: "artifact content" }],
          },
        ],
      };

      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield { type: "task", task: taskSnapshot } as A2AStreamEvent;
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      expect(core.getTask()).toEqual(taskSnapshot);
      expect(core.getArtifacts()).toHaveLength(1);

      const assistant = core.getMessages()[1]!;
      expect(assistant.content).toEqual([
        { type: "text", text: "Full snapshot" },
      ]);
    });
  });

  // --- Message event ---

  describe("message event", () => {
    it("handles standalone agent message event", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield {
            type: "message",
            message: {
              messageId: "m2",
              role: "agent",
              parts: [{ text: "Direct message" }],
            },
          } as A2AStreamEvent;
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      const assistant = core.getMessages()[1]!;
      expect(assistant.content).toEqual([
        { type: "text", text: "Direct message" },
      ]);
    });

    it("ignores user-role message events", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield {
            type: "message",
            message: {
              messageId: "m2",
              role: "user",
              parts: [{ text: "Echo" }],
            },
          } as A2AStreamEvent;
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      const assistant = core.getMessages()[1]!;
      expect(assistant.content).toEqual([]); // No content from user message
    });
  });

  // --- Cancel ---

  describe("cancel", () => {
    it("updates task from server cancel response", async () => {
      const cancelTask = vi.fn().mockResolvedValue({
        id: "t1",
        status: { state: "canceled" },
      });

      const core = createCore({ cancelTask });

      // Manually set task state to simulate a running task
      (core as any).currentTask = {
        id: "t1",
        status: { state: "working" },
      };
      (core as any).abortController = new AbortController();

      await core.cancel();

      expect(cancelTask).toHaveBeenCalledWith("t1");
      expect(core.getTask()!.status.state).toBe("canceled");
    });

    it("does nothing when no abort controller", async () => {
      const cancelTask = vi.fn();
      const core = createCore({ cancelTask });

      await core.cancel();

      expect(cancelTask).not.toHaveBeenCalled();
    });
  });

  // --- Error handling ---

  describe("error handling", () => {
    it("sets error status and re-throws on stream failure", async () => {
      const onError = vi.fn();

      const core = new A2AThreadRuntimeCore({
        client: createMockClient({
          streamMessage: vi.fn().mockImplementation(() => ({
            async next() {
              throw new Error("Network error");
            },
            [Symbol.asyncIterator]() {
              return this;
            },
          })),
        }),
        onError,
        notifyUpdate,
      });

      await expect(core.append(createUserAppendMessage("Go"))).rejects.toThrow(
        "Network error",
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0]![0].message).toBe("Network error");

      const assistant = core.getMessages()[1]!;
      expect(assistant.status).toEqual({
        type: "incomplete",
        reason: "error",
      });
    });

    it("marks complete when stream ends without terminal status", async () => {
      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* () {
          // Stream ends without any events
        }),
      });

      await core.append(createUserAppendMessage("Go"));

      const assistant = core.getMessages()[1]!;
      expect(assistant.status).toEqual({
        type: "complete",
        reason: "stop",
      });
    });
  });

  // --- Concurrent run protection ---

  describe("concurrent runs", () => {
    it("aborts previous run when new message is sent", async () => {
      let streamCount = 0;
      const abortedSignals: boolean[] = [];

      const core = createCore({
        streamMessage: vi.fn().mockImplementation(async function* (
          _msg: any,
          _cfg: any,
          _meta: any,
          signal: AbortSignal,
        ) {
          streamCount++;
          abortedSignals.push(signal.aborted);

          if (streamCount === 1) {
            // First stream: hang until aborted
            await new Promise((resolve) => {
              signal.addEventListener("abort", resolve, { once: true });
            });
            return;
          }

          yield statusUpdateEvent("completed", "Second run done");
        }),
      });

      // Start first run (don't await)
      const first = core.append(createUserAppendMessage("First"));

      // Small delay to let stream start
      await new Promise((r) => setTimeout(r, 10));

      // Start second run - should abort first
      await core.append(createUserAppendMessage("Second"));

      await first;

      // Second run should have completed
      expect(core.isRunning()).toBe(false);
    });
  });

  // --- applyExternalMessages ---

  describe("applyExternalMessages", () => {
    it("replaces all messages", () => {
      const core = createCore();

      const msgs: ThreadMessage[] = [
        {
          id: "ext-1",
          role: "user",
          createdAt: new Date(),
          content: [{ type: "text", text: "External" }],
          status: { type: "complete", reason: "stop" },
        } as ThreadMessage,
      ];

      core.applyExternalMessages(msgs);

      expect(core.getMessages()).toHaveLength(1);
      expect(core.getMessages()[0]!.id).toBe("ext-1");
    });
  });
});
