// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { AssistantRuntime } from "@assistant-ui/core";
import { useAcpRuntime } from "./useAcpRuntime";
import type { AcpWebSocketLike } from "./AcpClient";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Frame = {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: any;
  result?: any;
};

class FakeAgent {
  readonly sent: Frame[] = [];
  readonly sockets: FakeSocket[] = [];
  sessions = 0;
  answerPrompts = true;
  permissionOnTurn = 0;
  turns = 0;

  readonly factory = (): AcpWebSocketLike => {
    const socket = new FakeSocket(this);
    this.sockets.push(socket);
    queueMicrotask(() => socket.onopen?.());
    return socket;
  };

  current(): FakeSocket {
    return this.sockets.at(-1)!;
  }

  methods(): string[] {
    return this.sent.flatMap((frame) => (frame.method ? [frame.method] : []));
  }

  prompts(): { sessionId: string; text: string }[] {
    return this.sent
      .filter((frame) => frame.method === "session/prompt")
      .map((frame) => ({
        sessionId: frame.params.sessionId,
        text: frame.params.prompt[0].text,
      }));
  }
}

class FakeSocket implements AcpWebSocketLike {
  onopen: ((event?: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event?: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  private readonly agent: FakeAgent;
  private pendingPrompt: number | string | undefined;
  private closed = false;

  constructor(agent: FakeAgent) {
    this.agent = agent;
  }

  emit(frame: unknown) {
    queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(frame) }));
  }

  update(sessionId: string, update: unknown) {
    this.emit({
      jsonrpc: "2.0",
      method: "session/update",
      params: { sessionId, update },
    });
  }

  send(data: string) {
    const frame = JSON.parse(data) as Frame;
    this.agent.sent.push(frame);
    switch (frame.method) {
      case "initialize":
        this.emit({
          jsonrpc: "2.0",
          id: frame.id,
          result: { protocolVersion: 1, agentCapabilities: {} },
        });
        return;
      case "session/new":
        this.agent.sessions += 1;
        this.emit({
          jsonrpc: "2.0",
          id: frame.id,
          result: { sessionId: `s${this.agent.sessions}` },
        });
        return;
      case "session/prompt": {
        this.agent.turns += 1;
        const sessionId = frame.params.sessionId as string;
        this.update(sessionId, {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: `reply ${this.agent.turns}` },
        });
        if (this.agent.turns === this.agent.permissionOnTurn) {
          this.pendingPrompt = frame.id;
          this.update(sessionId, {
            sessionUpdate: "tool_call",
            toolCallId: "t1",
            title: "Edit file",
            kind: "edit",
            status: "pending",
          });
          this.emit({
            jsonrpc: "2.0",
            id: "permission-1",
            method: "session/request_permission",
            params: {
              sessionId,
              toolCall: { toolCallId: "t1" },
              options: [
                { optionId: "yes", name: "Allow", kind: "allow_once" },
                { optionId: "no", name: "Reject", kind: "reject_once" },
              ],
            },
          });
          return;
        }
        if (this.agent.answerPrompts) {
          this.emit({
            jsonrpc: "2.0",
            id: frame.id,
            result: { stopReason: "end_turn" },
          });
        }
        return;
      }
    }
    if (frame.id === "permission-1" && this.pendingPrompt !== undefined) {
      this.emit({
        jsonrpc: "2.0",
        id: this.pendingPrompt,
        result: { stopReason: "end_turn" },
      });
      this.pendingPrompt = undefined;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    queueMicrotask(() => this.onclose?.({}));
  }
}

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});

const mount = (agent: FakeAgent, errors: Error[] = []) => {
  const view: { runtime?: AssistantRuntime } = {};
  const onError = (error: Error) => errors.push(error);
  const Probe = () => {
    view.runtime = useAcpRuntime({
      url: "ws://agent.test/",
      cwd: "/workspace",
      webSocketFactory: agent.factory,
      onError,
    });
    return null;
  };
  root = createRoot(document.createElement("div"));
  act(() => root!.render(createElement(Probe)));
  return () => view.runtime!;
};

const settle = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });

const send = async (runtime: AssistantRuntime, text: string) => {
  await act(async () => {
    runtime.thread.append({ role: "user", content: [{ type: "text", text }] });
  });
  await settle();
};

const transcript = (runtime: AssistantRuntime) =>
  runtime.thread
    .getState()
    .messages.map(
      (message) =>
        `${message.role}:${message.content
          .map((part) => ("text" in part ? part.text : part.type))
          .join("")}`,
    );

describe("useAcpRuntime against an ACP agent", () => {
  it("runs a turn through the agent", async () => {
    const agent = new FakeAgent();
    const runtime = mount(agent);
    await settle();

    await send(runtime(), "hello");

    expect(agent.methods()).toEqual([
      "initialize",
      "session/new",
      "session/prompt",
    ]);
    expect(agent.sent[1]!.params.cwd).toBe("/workspace");
    expect(transcript(runtime())).toEqual(["user:hello", "assistant:reply 1"]);
    expect(runtime().thread.getState().messages[1]!.status).toEqual({
      type: "complete",
      reason: "stop",
    });
  });

  it("leaves the transcript and the session alone on reset", async () => {
    const agent = new FakeAgent();
    const runtime = mount(agent);
    await settle();
    await send(runtime(), "first");

    await act(async () => runtime().thread.reset());
    await settle();
    expect(transcript(runtime())).toEqual(["user:first", "assistant:reply 1"]);

    await send(runtime(), "second");
    expect(agent.prompts().map((prompt) => prompt.sessionId)).toEqual([
      "s1",
      "s1",
    ]);
  });

  it("recovers a session the connection lost through a new thread", async () => {
    const agent = new FakeAgent();
    const errors: Error[] = [];
    const runtime = mount(agent, errors);
    await settle();
    await send(runtime(), "first");

    agent.current().close();
    await settle();
    await send(runtime(), "lost");
    expect(errors.map((error) => error.message)).toEqual([
      expect.stringContaining("could not be restored"),
    ]);

    const before = runtime().threads.getState().mainThreadId;
    await act(async () => runtime().threads.switchToNewThread());
    await settle();
    expect(runtime().thread.getState().messages).toEqual([]);
    expect(runtime().threads.getState().mainThreadId).not.toBe(before);

    await send(runtime(), "fresh");
    expect(agent.prompts().at(-1)).toEqual({ sessionId: "s2", text: "fresh" });
    expect(transcript(runtime())).toEqual(["user:fresh", "assistant:reply 2"]);
  });

  it("answers a later turn's permission request on that turn", async () => {
    const agent = new FakeAgent();
    agent.permissionOnTurn = 2;
    const runtime = mount(agent);
    await settle();
    await send(runtime(), "first");
    const firstAnswer = runtime().thread.getState().messages[1];

    await send(runtime(), "second");
    const pending = runtime().thread.getState().messages[3]!;
    expect(pending.status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });

    await act(async () => {
      await runtime()
        .thread.getMessageById(pending.id)
        .getMessagePartByToolCallId("t1")
        .respondToToolApproval({ approved: true });
    });
    await settle();

    expect(agent.sent.find((frame) => frame.id === "permission-1")).toEqual({
      jsonrpc: "2.0",
      id: "permission-1",
      result: { outcome: { outcome: "selected", optionId: "yes" } },
    });
    const messages = runtime().thread.getState().messages;
    expect(messages[1]).toEqual(firstAnswer);
    expect(messages[3]!.status).toEqual({ type: "complete", reason: "stop" });
  });

  it("leaves a running turn behind when a new thread starts", async () => {
    const agent = new FakeAgent();
    agent.answerPrompts = false;
    const runtime = mount(agent);
    await settle();
    await send(runtime(), "stuck");
    expect(runtime().thread.getState().isRunning).toBe(true);

    await act(async () => runtime().threads.switchToNewThread());
    await settle();
    expect(
      agent.sent.find((frame) => frame.method === "session/cancel")?.params,
    ).toEqual({ sessionId: "s1" });
    expect(runtime().thread.getState().messages).toEqual([]);
    expect(runtime().thread.getState().isRunning).toBe(false);

    agent.answerPrompts = true;
    await send(runtime(), "next");
    expect(agent.prompts().at(-1)).toEqual({ sessionId: "s2", text: "next" });
    expect(transcript(runtime())).toEqual(["user:next", "assistant:reply 2"]);
  });
});
