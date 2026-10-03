import { describe, expect, it } from "vitest";
import {
  createAcpThreadState,
  isAcpStateRunning,
  reduceAcpThreadState,
  type AcpAssistantMessage,
  type AcpThreadEvent,
  type AcpThreadState,
  type AcpUserMessage,
} from "./acpThreadState";
import type {
  AcpPermissionRequest,
  AcpSessionConfigOption,
  AcpSessionUpdate,
} from "./types";

const user = (id: string, parentId: string | null = null): AcpUserMessage => ({
  role: "user",
  id,
  parentId,
  createdAt: 1,
  content: [{ type: "text", text: "hi" }],
  attachments: [],
});

const assistant = (
  id: string,
  parentId: string | null = null,
): AcpAssistantMessage => ({
  role: "assistant",
  id,
  parentId,
  createdAt: 2,
  status: { type: "running" },
  content: [],
});

const running = (state: AcpThreadState, id = "a1"): AcpThreadState =>
  reduceAcpThreadState(state, { type: "run-start", message: assistant(id) });

const update = (u: AcpSessionUpdate): AcpThreadEvent => ({
  type: "session-update",
  update: u,
});

const permissionRequest = (
  approvalId: string,
  toolCallId = "t1",
): AcpThreadEvent => ({
  type: "permission-request",
  approvalId,
  request: {
    sessionId: "s1",
    toolCall: { toolCallId, title: "Delete file" },
    options: [
      { optionId: "allow", name: "Allow", kind: "allow_once" },
      { optionId: "reject", name: "Reject", kind: "reject_once" },
    ],
  } satisfies AcpPermissionRequest,
});

const contentOf = (state: AcpThreadState, id = "a1") => {
  const message = state.messagesById[id];
  return message?.role === "assistant" ? message.content : [];
};

const toolPartOf = (state: AcpThreadState, toolCallId = "t1") => {
  const part = contentOf(state).find(
    (p) => p.type === "tool-call" && p.toolCallId === toolCallId,
  );
  return part?.type === "tool-call" ? part : undefined;
};

const textContent = (text: string) =>
  [{ type: "content", content: { type: "text", text } }] as const;

describe("reduceAcpThreadState", () => {
  it("starts from the empty state", () => {
    const state = createAcpThreadState();
    expect(state.loadState).toEqual({ type: "idle" });
    expect(state.connectionState).toBe("disconnected");
    expect(state.messageOrder).toEqual([]);
    expect(isAcpStateRunning(state)).toBe(false);
  });

  it("tracks load transitions and ignores a redundant load-start", () => {
    const loading = reduceAcpThreadState(createAcpThreadState(), {
      type: "load-start",
    });
    expect(loading.loadState).toEqual({ type: "loading" });
    expect(reduceAcpThreadState(loading, { type: "load-start" })).toBe(loading);

    const ready = reduceAcpThreadState(loading, { type: "load-ready" });
    expect(ready.loadState).toEqual({ type: "ready" });
    expect(
      reduceAcpThreadState(createAcpThreadState(), { type: "load-ready" }),
    ).toBe(createAcpThreadState());

    const failed = reduceAcpThreadState(loading, {
      type: "load-error",
      error: "boom",
    });
    expect(failed.loadState).toEqual({ type: "error", error: "boom" });
  });

  it("records connection details without clearing earlier agent info", () => {
    let state = reduceAcpThreadState(createAcpThreadState(), {
      type: "connection",
      connectionState: "connected",
      sessionId: "s1",
      agentInfo: { name: "agent", version: "1.0.0" },
    });
    expect(state.connectionState).toBe("connected");
    expect(state.sessionId).toBe("s1");
    expect(state.agentInfo).toEqual({ name: "agent", version: "1.0.0" });

    state = reduceAcpThreadState(state, {
      type: "connection",
      connectionState: "connected",
      sessionId: "s2",
    });
    expect(state.sessionId).toBe("s2");
    expect(state.agentInfo).toEqual({ name: "agent", version: "1.0.0" });
  });

  it("takes the session modes and config options a connection reports", () => {
    const configOptions: AcpSessionConfigOption[] = [
      { type: "boolean", currentValue: true },
    ];
    let state = reduceAcpThreadState(createAcpThreadState(), {
      type: "connection",
      connectionState: "connected",
      sessionId: "s1",
      sessionModes: {
        currentModeId: "code",
        availableModes: [{ id: "code", name: "Code" }],
      },
      sessionConfigOptions: configOptions,
    });
    expect(state.currentModeId).toBe("code");
    expect(state.configOptions).toEqual(configOptions);

    state = reduceAcpThreadState(
      state,
      update({ sessionUpdate: "current_mode_update", currentModeId: "plan" }),
    );
    expect(state.currentModeId).toBe("plan");

    state = reduceAcpThreadState(state, {
      type: "connection",
      connectionState: "connected",
      sessionId: "s1",
    });
    expect(state.currentModeId).toBe("plan");
    expect(state.configOptions).toEqual(configOptions);
  });

  it("clears the session id when the client loses it", () => {
    const connected = reduceAcpThreadState(createAcpThreadState(), {
      type: "connection",
      connectionState: "connected",
      sessionId: "s1",
    });
    const disconnected = reduceAcpThreadState(connected, {
      type: "connection",
      connectionState: "disconnected",
      sessionId: undefined,
    });
    expect(disconnected.connectionState).toBe("disconnected");
    expect(disconnected.sessionId).toBeUndefined();
  });

  it("appends messages and moves the head", () => {
    let state = reduceAcpThreadState(createAcpThreadState(), {
      type: "append-message",
      message: user("u1"),
    });
    expect(state.messageOrder).toEqual(["u1"]);
    expect(state.headId).toBe("u1");

    state = reduceAcpThreadState(state, {
      type: "append-message",
      message: assistant("a1", "u1"),
    });
    expect(state.messageOrder).toEqual(["u1", "a1"]);
    expect(state.headId).toBe("a1");

    const same = reduceAcpThreadState(state, {
      type: "append-message",
      message: { ...assistant("a1", "u1"), content: [] },
    });
    expect(same.messageOrder).toEqual(["u1", "a1"]);
    expect(same.headId).toBe("a1");
  });

  it("replaces messages and clears run and permission state", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(state, permissionRequest("p1"));
    expect(Object.keys(state.permissions)).toEqual(["p1"]);

    state = reduceAcpThreadState(state, {
      type: "replace-messages",
      messages: [user("u9")],
      headId: "u9",
    });
    expect(state.messageOrder).toEqual(["u9"]);
    expect(state.headId).toBe("u9");
    expect(state.run).toEqual({ type: "idle" });
    expect(state.permissions).toEqual({});
  });

  it("streams agent text into the running assistant message", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(state, {
      type: "append-message",
      message: user("u1"),
    });
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "Hel" },
      }),
    );
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "lo" },
      }),
    );
    expect(contentOf(state)).toEqual([{ type: "text", text: "Hello" }]);
  });

  it("ignores session updates when no run is active", () => {
    const state = createAcpThreadState();
    expect(
      reduceAcpThreadState(
        state,
        update({
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "nope" },
        }),
      ),
    ).toBe(state);
  });

  it("ignores user_message_chunk updates", () => {
    const state = running(createAcpThreadState());
    expect(
      reduceAcpThreadState(
        state,
        update({
          sessionUpdate: "user_message_chunk",
          content: { type: "text", text: "echo" },
        }),
      ),
    ).toBe(state);
  });

  it("records plan, title, mode, commands, config and usage", () => {
    let state = createAcpThreadState();
    const entries = [
      {
        content: "step",
        priority: "medium" as const,
        status: "pending" as const,
      },
    ];
    state = reduceAcpThreadState(
      state,
      update({ sessionUpdate: "plan", entries }),
    );
    expect(state.plan).toBe(entries);
    expect(
      reduceAcpThreadState(state, update({ sessionUpdate: "plan", entries })),
    ).toBe(state);

    state = reduceAcpThreadState(
      state,
      update({ sessionUpdate: "session_info_update", title: "My session" }),
    );
    expect(state.sessionTitle).toBe("My session");
    expect(
      reduceAcpThreadState(
        state,
        update({ sessionUpdate: "session_info_update" }),
      ),
    ).toBe(state);

    state = reduceAcpThreadState(
      state,
      update({ sessionUpdate: "current_mode_update", currentModeId: "code" }),
    );
    expect(state.currentModeId).toBe("code");

    const commands = [{ name: "help", description: "Show help" }];
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "available_commands_update",
        availableCommands: commands,
      }),
    );
    expect(state.availableCommands).toBe(commands);

    const configOptions = [
      {
        type: "select" as const,
        id: "model",
        name: "Model",
        currentValue: "a",
        options: [{ value: "a", name: "A" }],
      },
    ];
    state = reduceAcpThreadState(
      state,
      update({ sessionUpdate: "config_option_update", configOptions }),
    );
    expect(state.configOptions).toBe(configOptions);

    state = reduceAcpThreadState(
      state,
      update({ sessionUpdate: "usage_update", used: 10, size: 100 }),
    );
    expect(state.usage).toEqual({ used: 10, size: 100, cost: null });
  });

  it("keeps a running tool call open while its content streams", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "tool_call",
        toolCallId: "t1",
        title: "Search",
        status: "in_progress",
      }),
    );
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "tool_call_update",
        toolCallId: "t1",
        content: textContent("partial"),
      }),
    );
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "tool_call_update",
        toolCallId: "t1",
        content: textContent("partial and more"),
      }),
    );

    expect(state.toolCallStatuses).toEqual({ t1: "in_progress" });
    expect(toolPartOf(state)).toMatchObject({
      result: "partial and more",
      isPreliminary: true,
    });
    expect(toolPartOf(state)?.isError).toBeUndefined();
  });

  it("does not infer completion from a streamed tool result", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(
      state,
      update({ sessionUpdate: "tool_call", toolCallId: "t1", title: "Search" }),
    );
    for (const text of ["first", "second"]) {
      state = reduceAcpThreadState(
        state,
        update({
          sessionUpdate: "tool_call_update",
          toolCallId: "t1",
          content: textContent(text),
        }),
      );
    }

    expect(state.toolCallStatuses).toEqual({});
    expect(toolPartOf(state)).toMatchObject({
      result: "second",
      isPreliminary: true,
    });
  });

  it("settles a tool call when a later update reports its status", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "tool_call",
        toolCallId: "t1",
        title: "Search",
        status: "in_progress",
      }),
    );
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "tool_call_update",
        toolCallId: "t1",
        content: textContent("done"),
      }),
    );
    expect(toolPartOf(state)?.isPreliminary).toBe(true);

    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "tool_call_update",
        toolCallId: "t1",
        status: "completed",
      }),
    );

    expect(state.toolCallStatuses).toEqual({ t1: "completed" });
    expect(toolPartOf(state)).toMatchObject({
      result: "done",
      isPreliminary: false,
      isError: false,
    });
  });

  it("does not carry a settled status into a reused tool call id", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "tool_call",
        toolCallId: "t1",
        title: "Search",
        status: "completed",
        content: textContent("done"),
      }),
    );
    expect(state.toolCallStatuses).toEqual({ t1: "completed" });

    state = running(state, "a2");
    expect(state.toolCallStatuses).toEqual({});

    state = reduceAcpThreadState(
      state,
      update({
        sessionUpdate: "tool_call",
        toolCallId: "t1",
        title: "Search again",
      }),
    );

    const part = contentOf(state, "a2").find(
      (p) => p.type === "tool-call" && p.toolCallId === "t1",
    );
    expect(part).toBeDefined();
    expect(part).not.toHaveProperty("result");
  });

  it("marks the assistant as requiring action on a permission request", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(state, permissionRequest("p1"));

    const message = state.messagesById["a1"] as AcpAssistantMessage;
    expect(message.status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });
    expect(state.permissions["p1"]).toEqual({
      approvalId: "p1",
      toolCallId: "t1",
      options: [
        { id: "allow", kind: "allow-once", label: "Allow" },
        { id: "reject", kind: "reject-once", label: "Reject" },
      ],
    });
    const part = message.content[0] as { approval?: { id: string } };
    expect(part.approval?.id).toBe("p1");
  });

  it("resolves a permission and records the decision on the part", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(state, permissionRequest("p1"));
    state = reduceAcpThreadState(state, {
      type: "permission-resolved",
      approvalId: "p1",
      approved: true,
      optionId: "allow",
      cancelled: false,
    });

    expect(state.permissions).toEqual({});
    const message = state.messagesById["a1"] as AcpAssistantMessage;
    expect(message.status).toEqual({ type: "running" });
    expect(message.content[0]).toMatchObject({
      type: "tool-call",
      approval: { id: "p1", approved: true, optionId: "allow" },
    });
  });

  it("cancels outstanding permissions on permissions-cancelled", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(state, permissionRequest("p1"));
    state = reduceAcpThreadState(state, permissionRequest("p2", "t2"));
    state = reduceAcpThreadState(state, { type: "permissions-cancelled" });

    expect(state.permissions).toEqual({});
    const message = state.messagesById["a1"] as AcpAssistantMessage;
    expect(message.status).toEqual({ type: "running" });
    for (const part of message.content) {
      if (part.type !== "tool-call") continue;
      expect(part.approval?.resolution).toBe("cancelled");
      expect(part.approval?.approved).toBeUndefined();
    }
  });

  it("ends the run with the given status and cancels permissions", () => {
    let state = running(createAcpThreadState());
    state = reduceAcpThreadState(state, permissionRequest("p1"));
    state = reduceAcpThreadState(state, {
      type: "run-end",
      status: { type: "complete", reason: "stop" },
    });

    expect(state.run).toEqual({ type: "idle" });
    expect(isAcpStateRunning(state)).toBe(false);
    expect(state.permissions).toEqual({});
    const message = state.messagesById["a1"] as AcpAssistantMessage;
    expect(message.status).toEqual({ type: "complete", reason: "stop" });
    expect(
      (message.content[0] as { approval?: { resolution?: string } }).approval
        ?.resolution,
    ).toBe("cancelled");
  });

  it("ends the run without an assistant message", () => {
    const state = reduceAcpThreadState(createAcpThreadState(), {
      type: "run-end",
      status: { type: "incomplete", reason: "cancelled" },
    });
    expect(state.run).toEqual({ type: "idle" });
  });

  it("returns the same state for an unknown event", () => {
    const state = createAcpThreadState();
    expect(
      reduceAcpThreadState(state, {
        type: "nope",
      } as unknown as AcpThreadEvent),
    ).toBe(state);
  });
});
